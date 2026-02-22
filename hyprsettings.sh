#!/usr/bin/env bash
set -euo pipefail

### CONFIGURATION
TEST_MODE=false # Default. Overridden by -t flag.

REPO_NAME="hyprsettings"
REPO_OWNER="acropolis914"
REPO_URL="https://github.com/$REPO_OWNER/$REPO_NAME.git"

# App Names (Set in main)
APP_NAME=""
DESKTOP_NAME=""

# Install locations
INSTALL_TYPE=""
INSTALL_DIR=""
BIN_DIR=""
DESKTOP_DIR=""
ICON_DIR=""

# State
ONLINE=false
IN_REPO=false
SCRIPT_DIR=""
EXISTING="" # "none", "script-user", "script-system", "script-local", "package"

# CLI flags
AUTO_MODE=false
CLI_INSTALL_TYPE=""

# Action queue
ACTIONS=()

### TERMINAL HELPERS
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[! ]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*" >&2; }
header()  { echo -e "${BOLD}${BLUE}  $*${NC}";}
subheader() { echo -e "\n${CYAN}── $* ──${NC}\n"; }
dim()     { echo -e "${DIM}$*${NC}"; }
link() {
    local url="$1"
    local text="$2"
    # Light blue + underline
    printf '\e[4;94m%s\e[0m\n' "$text ($url)"
}

spinner() {
    local pid=$1
    local msg="${2:-Loading}"
    local chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local i=0
    tput civis 2>/dev/null || true
    while kill -0 "$pid" 2>/dev/null; do
        printf "\r  ${DIM}%s${NC} %s " "$msg" "${chars:i++%${#chars}:1}"
        sleep 0.08
    done
    tput cnorm 2>/dev/null || true
    printf "\r\033[K"
}

confirm() {
    local msg="$1"
    local default="${2:-Y}"
    local prompt input

    if [[ "$AUTO_MODE" == "true" ]]; then
        [[ "$default" == "Y" ]] && return 0 || return 1
    fi
    if [[ "$default" == "Y" ]]; then prompt="${DIM}[Y/n/0=quit]${NC}"; else prompt="${DIM}[y/N/0=quit]${NC}"; fi

    while true; do
        echo -en "  $msg $prompt: "
        read -r input
        input="${input^^}"
        [[ -z "$input" ]] && input="$default"
        case "$input" in
            Y) return 0 ;;
            N) return 1 ;;
            0) echo -e "\n${DIM}Goodbye!${NC}"; exit 0 ;;
            *) echo -e "  ${DIM}Invalid.${NC}" ;;
        esac
    done
}

### PATH SETTERS

set_paths_user() {
    INSTALL_TYPE="user"
    INSTALL_DIR="$HOME/.local/share/$APP_NAME"
    BIN_DIR="$HOME/.local/bin"
    DESKTOP_DIR="$HOME/.local/share/applications"
    ICON_DIR="$HOME/.local/share/icons/hicolor/48x48/apps"
}

set_paths_system() {
    INSTALL_TYPE="system"
    INSTALL_DIR="/usr/share/$APP_NAME"
    BIN_DIR="/usr/local/bin"
    DESKTOP_DIR="/usr/share/applications"
    ICON_DIR="/usr/share/icons/hicolor/48x48/apps"
}

set_paths_local() {
    INSTALL_TYPE="local"
    INSTALL_DIR="$SCRIPT_DIR"
    BIN_DIR="$HOME/.local/bin"
    DESKTOP_DIR="$HOME/.local/share/applications"
    ICON_DIR="$HOME/.local/share/icons/hicolor/48x48/apps"
}

### CHECKS

check_online() {
    if curl -fsSL --connect-timeout 2 --max-time 2 "https://github.com" &>/dev/null; then
        ONLINE=true
    else
        ONLINE=false
    fi
}

check_in_repo() {
    if [[ -d ".git" ]]; then
        local remote
        remote=$(git remote get-url origin 2>/dev/null) || remote=""
        if [[ "$remote" == *"$REPO_OWNER/$REPO_NAME"* ]]; then
            IN_REPO=true
            SCRIPT_DIR="$PWD"
            return
        fi
    fi
    IN_REPO=false
}

check_repo_sync() {
    if [[ "$IN_REPO" == "true" ]]; then
        check_online
        if [[ "$ONLINE" == "true" ]]; then
            echo -e "  ${DIM}Checking for updates...${NC}"
            git fetch origin master --quiet 2>/dev/null || true

            local LOCAL_HASH REMOTE_HASH
            LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null)
            REMOTE_HASH=$(git rev-parse origin/master 2>/dev/null)

            if [[ "$LOCAL_HASH" != "$REMOTE_HASH" ]]; then
                warn "Your local repository is behind origin/master."
                if confirm "Pull latest changes before installing?" Y; then
                    echo -e "  ${DIM}Pulling...${NC}"
                    git pull origin master --quiet
                    info "Repository updated."
                else
                    dim "  Using local version."
                fi
            else
                info "Local repository is up to date."
            fi
        else
            dim "  Offline: Skipping update check, using local copy."
        fi
    fi
}

check_existing() {
    # ------------------------------------------------------------------
    # 1. MARKER CHECK (Highest Priority - Definite Script Install)
    # ------------------------------------------------------------------
    local user_marker="$HOME/.local/share/$APP_NAME/.script-installed"
    local system_marker="/usr/share/$APP_NAME/.script-installed"
    local local_marker="$SCRIPT_DIR/.script-installed"

    if [[ -f "$user_marker" ]]; then EXISTING="script-user"; set_paths_user; return; fi
    if [[ -f "$system_marker" ]]; then EXISTING="script-system"; set_paths_system; return; fi
    if [[ "$IN_REPO" == "true" && -f "$local_marker" ]]; then EXISTING="script-local"; set_paths_local; return; fi

    # ------------------------------------------------------------------
    # 2. PACKAGE MANAGER CHECK (Prioritize /usr/bin over greedy check)
    # ------------------------------------------------------------------
    # If the binary is in /usr/bin, it's almost certainly a Package (AUR), not us.
    local bin_path
    bin_path=$(command -v "$APP_NAME" 2>/dev/null || true)

    if [[ "$bin_path" == "/usr/bin/$APP_NAME" ]]; then
        EXISTING="package"
        return
    fi

    # ------------------------------------------------------------------
    # 3. GREEDY SCRIPT DETECTION (Find broken/partial installs)
    # ------------------------------------------------------------------

    # Check SYSTEM paths (We look for /usr/local/bin, NOT /usr/bin)
    local sys_bin="/usr/local/bin/$APP_NAME"
    local sys_dir="/usr/share/$APP_NAME"

    if [[ -f "$sys_bin" ]]; then
        # If launcher is in /usr/local/bin, it's definitely us
        EXISTING="script-system"
        set_paths_system
        if [[ ! -d "$sys_dir" ]]; then warn "Partial System Install: Main directory missing"; fi
        return
    elif [[ -d "$sys_dir" ]]; then
        # /usr/share exists but NO bin in /usr/bin or /usr/local/bin...
        # If it was AUR, it would likely be in /usr/bin.
        # Since we passed the package check, and bin is missing, assume partial script.
        EXISTING="script-system"
        set_paths_system
        warn "Partial System Install: Launcher missing"
        return
    fi

    # Check USER paths
    local usr_bin="$HOME/.local/bin/$APP_NAME"
    local usr_dir="$HOME/.local/share/$APP_NAME"

    if [[ -f "$usr_bin" || -d "$usr_dir" ]]; then
        EXISTING="script-user"
        set_paths_user
        if [[ ! -d "$usr_dir" ]]; then warn "Partial User Install: Main directory missing"; fi
        return
    fi

    # 4. Check IN-REPO status
    if [[ "$IN_REPO" == "true" ]]; then
        EXISTING="in-repo-uninstalled"
        SCRIPT_DIR="$PWD"
        set_paths_local # Load vars for safety
        return
    fi

    # 5. Last resort package check (e.g., weird aliases)
    if command -v "$APP_NAME" &>/dev/null; then
        EXISTING="package"
        return
    fi

    EXISTING="none"
}

check_sudo() {
    if [[ "$EUID" -ne 0 ]]; then
        if ! command -v sudo &>/dev/null; then error "sudo is not installed."; exit 1; fi
        info "Requesting root credentials..."
        if ! sudo -v; then error "Root credentials not granted."; exit 1; fi
    fi
}

### STARTUP

startup_checks() {
    header "
 ╻ ╻╻ ╻┏━┓┏━┓┏━┓┏━╸╺┳╸╺┳╸╻┏┓╻┏━╸┏━┓
 ┣━┫┗┳┛┣━┛┣┳┛┗━┓┣╸  ┃  ┃ ┃┃┗┫┃╺┓┗━┓
 ╹ ╹ ╹ ╹  ╹┗╸┗━┛┗━╸ ╹  ╹ ╹╹ ╹┗━┛┗━┛
 \e[34m\e]8;;https://github.com/acropolis914/hyprsettings\e\\ github.com/acropolis914/hyprsettings\e]8;;\e\\
    "
    
    if [[ "$TEST_MODE" == "true" ]]; then echo -e "${YELLOW}⚠ TEST MODE${NC} — Installing as ${BOLD}$APP_NAME${NC}\n"; fi

    check_in_repo
    if [[ "$IN_REPO" == "true" ]]; then info "Running from local repository"; dim "    $SCRIPT_DIR"; fi

    check_existing
    case "$EXISTING" in
        script-user)   info "Detected User Installation"; dim "    $INSTALL_DIR" ;;
        script-system) info "Detected System Installation"; dim "    $INSTALL_DIR" ;;
        script-local)  info "Detected Local Installation (In-Place)"; dim "    $INSTALL_DIR" ;;
        package)       info "Detected Package Manager Installation" ;;
        in-repo-uninstalled) dim "    Source detected (Not installed)" ;;
        none)          dim "    No existing installation found" ;;
    esac
    echo
}

### ACTION RUNNER

run_actions() {
    subheader "Processing"
    local is_uninstall=false

    for act in "${ACTIONS[@]}"; do
        case "$act" in
            uninstall)
                is_uninstall=true
                echo -e "  ${DIM}Uninstalling...${NC}"
                local mfile="$INSTALL_DIR/.script-installed"

                if [[ "$INSTALL_TYPE" == "system" ]]; then
                    if [[ -f "$BIN_DIR/$APP_NAME" ]]; then sudo rm -f "$BIN_DIR/$APP_NAME"; dim "    Removed launcher"; fi
                    if [[ -f "$DESKTOP_DIR/$APP_NAME.desktop" ]]; then sudo rm -f "$DESKTOP_DIR/$APP_NAME.desktop"; dim "    Removed desktop entry"; fi
                    if [[ -f "$ICON_DIR/$APP_NAME.png" ]]; then sudo rm -f "$ICON_DIR/$APP_NAME.png"; dim "    Removed icon"; fi
                    sudo rm -f "$mfile"
                    if [[ -d "$INSTALL_DIR" ]]; then sudo rm -rf "$INSTALL_DIR"; dim "    Removed directory"; fi
                else
                    if [[ -f "$BIN_DIR/$APP_NAME" ]]; then rm -f "$BIN_DIR/$APP_NAME"; dim "    Removed launcher"; fi
                    if [[ -f "$DESKTOP_DIR/$APP_NAME.desktop" ]]; then rm -f "$DESKTOP_DIR/$APP_NAME.desktop"; dim "    Removed desktop entry"; fi
                    if [[ -f "$ICON_DIR/$APP_NAME.png" ]]; then rm -f "$ICON_DIR/$APP_NAME.png"; dim "    Removed icon"; fi
                    rm -f "$mfile"
                    if [[ "$INSTALL_TYPE" != "local" && "$INSTALL_DIR" != "$PWD" ]]; then
                         if [[ -d "$INSTALL_DIR" ]]; then rm -rf "$INSTALL_DIR"; dim "    Removed directory"; fi
                    fi
                fi
                info "Uninstall complete"
                ;;

            clone_repo)
                check_online
                if [[ "$ONLINE" != "true" ]]; then error "Offline. Cannot clone."; exit 1; fi
                local cmd_prefix=""
                [[ "$INSTALL_TYPE" == "system" ]] && cmd_prefix="sudo"
                echo -e "  ${DIM}Cloning repository...${NC}"
                if ! $cmd_prefix git clone "$REPO_URL" "$INSTALL_DIR" --quiet; then error "Clone failed."; exit 1; fi
                info "Repository cloned"
                ;;

            copy_repo)
                echo -e "  ${DIM}Copying local files...${NC}"
                if [[ "$INSTALL_TYPE" == "system" ]]; then
                    sudo mkdir -p "$INSTALL_DIR"
                    sudo cp -r "$SCRIPT_DIR/." "$INSTALL_DIR/"
                else
                    mkdir -p "$INSTALL_DIR"
                    cp -r "$SCRIPT_DIR/." "$INSTALL_DIR/"
                fi
                info "Files copied"
                ;;

            venv)
                echo -e "  ${DIM}Building Python environment...${NC}"
                local venv_dir="$INSTALL_DIR/.venv"
                local cmd_prefix=""
                [[ "$INSTALL_TYPE" == "system" ]] && cmd_prefix="sudo"
                $cmd_prefix python -m venv "$venv_dir"
                $cmd_prefix "$venv_dir/bin/pip" install -U pip setuptools wheel -q
                $cmd_prefix "$venv_dir/bin/pip" install tomlkit rich pywebview packaging "pywebview[gtk]" flask flask-cors python-dotenv -q
                info "Venv ready"
                ;;
            
            run_script)
                local run_script="$INSTALL_DIR/run.sh"

                if [[ ! -f "$run_script" ]]; then
                    echo -e "  ${DIM}run.sh missing — generating default launcher...${NC}"

                    local run_content='#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
. ".venv/bin/activate"
exec python "src/hyprsettings" "$@"'

                if [[ "$INSTALL_TYPE" == "system" ]]; then
                        echo "$run_content" | sudo tee "$run_script" > /dev/null
                        sudo chmod +x "$run_script"
                    else
                        echo "$run_content" > "$run_script"
                        chmod +x "$run_script"
                    fi
                else
                    echo -e "  ${DIM}run.sh exists — keeping upstream version${NC}"
                    if [[ "$INSTALL_TYPE" == "system" ]]; then
                        sudo chmod +x "$run_script"
                    else
                        chmod +x "$run_script"
                    fi
                fi
                ;;

            launcher)
                local launcher="$BIN_DIR/$APP_NAME"
                local launcher_content="#!/usr/bin/env bash
cd \"$INSTALL_DIR\" && ./run.sh \"\$@\""
                if [[ "$INSTALL_TYPE" == "system" ]]; then
                    sudo mkdir -p "$BIN_DIR"
                    echo "$launcher_content" | sudo tee "$launcher" > /dev/null
                    sudo chmod +x "$launcher"
                else
                    mkdir -p "$BIN_DIR"
                    echo "$launcher_content" > "$launcher"
                    chmod +x "$launcher"
                fi
                info "Launcher created"
                ;;

            desktop)
                local desktop_file="$DESKTOP_DIR/$APP_NAME.desktop"
                local desktop_content="[Desktop Entry]
Name=$DESKTOP_NAME
Comment=Configurator for Hyprland
Exec=$BIN_DIR/$APP_NAME
Icon=$APP_NAME
Terminal=false
Type=Application
Categories=Utility;
StartupNotify=true"
                if [[ "$INSTALL_TYPE" == "system" ]]; then
                    sudo mkdir -p "$DESKTOP_DIR"
                    echo "$desktop_content" | sudo tee "$desktop_file" > /dev/null
                else
                    mkdir -p "$DESKTOP_DIR"
                    echo "$desktop_content" > "$desktop_file"
                fi
                info "Desktop entry created"
                ;;

            icon)
                local icon_src="$INSTALL_DIR/assets/icon-48.png"
                local icon_dest="$ICON_DIR/$APP_NAME.png"
                if [[ -f "$icon_src" ]]; then
                    if [[ "$INSTALL_TYPE" == "system" ]]; then
                        sudo mkdir -p "$ICON_DIR"
                        sudo cp "$icon_src" "$icon_dest"
                        sudo chmod 644 "$icon_dest"
                        sudo update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
                        sudo gtk-update-icon-cache -f /usr/share/icons/hicolor 2>/dev/null || true
                    else
                        mkdir -p "$ICON_DIR"
                        cp "$icon_src" "$icon_dest"
                        update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
                        gtk-update-icon-cache -f "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
                    fi
                    info "Icon installed & cache updated"
                else
                    warn "Icon asset missing"
                fi
                ;;

            marker)
                local mfile="$INSTALL_DIR/.script-installed"
                if [[ "$INSTALL_TYPE" == "system" ]]; then
                    echo "installed=$(date)" | sudo tee "$mfile" > /dev/null
                else
                    echo "installed=$(date)" > "$mfile"
                fi
                ;;

            update)
                echo -e "  ${DIM}Updating source...${NC}"
                check_online
                if [[ "$ONLINE" == "true" ]]; then
                    cd "$INSTALL_DIR"
                    if [[ "$INSTALL_TYPE" == "system" ]]; then sudo git pull --ff-only; else git pull --ff-only; fi
                    info "Source updated"
                else
                    error "Offline. Cannot update."
                fi
                ;;
        esac
    done

    echo
    subheader "${GREEN}${BOLD}✓ Done!${NC}"
    echo
    # Helper for light blue underlined links


    if [[ "$is_uninstall" != "true" ]]; then
        dim "Run '$APP_NAME' or check your menu."
        echo

        # GitHub star prompt
        printf 'Please consider starring this project on GitHub:\n'
        printf '  ⭐ '
        link "https://github.com/acropolis914/hyprsettings" "hyprsettings"
        echo

        printf 'Thank you for trying 💧hyprsettings!\n'
        link "https://github.com/acropolis914/hyprsettings" "Made with ❣️ by AcroPolis914 — Project page"
        echo

        # Auto launch prompt
        read -n1 -p "Do you want to launch $APP_NAME now? [Y/n]: " yn
        echo
        yn="${yn:-Y}"
        if [[ "${yn^^}" == "Y" ]]; then
            "$APP_NAME" &
        fi

        exit 0
    fi

    # Uninstall closing message
    if [[ "$is_uninstall" == "true" ]]; then
        echo
        dim "You can always come back and try it again by running:"
        echo -e "\e[1mcurl -sL https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.sh | sh\e[0m"
        echo
        printf 'Thank you for trying 💧hyprsettings!\n'
        link "https://github.com/acropolis914/hyprsettings" "Made with ❣️ by AcroPolis914 — Project page"
        echo

        exit 0
    fi


}

### LOGIC BRANCHES

do_reinstall() {
    ACTIONS=()
    ACTIONS+=("uninstall")
    if [[ "$IN_REPO" == "true" ]]; then
        check_repo_sync
        ACTIONS+=("copy_repo")
    else
        ACTIONS+=("clone_repo")
    fi
    ACTIONS+=("venv" "run_script" "launcher" "desktop" "icon" "marker")
    if [[ "$EXISTING" == "script-system" ]]; then check_sudo; fi
    run_actions
}

quick_install() {
    set_paths_user
    if [[ "$EXISTING" == "script-system" ]]; then
        warn "A System install exists. You are about to install a User copy."
        if ! confirm "Create duplicate User install?" N; then return; fi
    fi

    echo -e "  Install to: ${BOLD}$INSTALL_DIR${NC}"
    if [[ -d "$INSTALL_DIR" ]]; then ACTIONS+=("delete_install_dir"); fi

    if [[ "$IN_REPO" == "true" ]]; then
        check_repo_sync
        ACTIONS+=("copy_repo")
    else
        ACTIONS+=("clone_repo")
    fi

    ACTIONS+=("venv" "run_script" "launcher" "desktop" "icon" "marker")
    if confirm "Proceed?" Y; then run_actions; else echo -e "\n${DIM}Cancelled.${NC}"; fi
}

custom_install() {
    echo -e "\n  ${BOLD}Select Type:${NC}"
    echo -e "  1) User   ${DIM}($HOME/.local/share/$APP_NAME)${NC}"

    if [[ "$IN_REPO" == "true" ]]; then
        echo -e "  2) Local  ${DIM}(In-place)${NC}"
        echo -e "  3) System ${DIM}(/usr/share/$APP_NAME)${NC}"
    else
        echo -e "  2) System ${DIM}(/usr/share/$APP_NAME)${NC}"
    fi

    echo -e "  0) Cancel"

    read -rp "  Select: " c

    case "$c" in
        1)
            set_paths_user
            [[ -d "$INSTALL_DIR" ]] && ACTIONS+=("delete_install_dir")
            [[ "$IN_REPO" == "true" ]] && { check_repo_sync; ACTIONS+=("copy_repo"); } || ACTIONS+=("clone_repo")
            ;;
        2)
            if [[ "$IN_REPO" == "true" ]]; then
                set_paths_local
            else
                check_sudo
                set_paths_system
                [[ -d "$INSTALL_DIR" ]] && ACTIONS+=("delete_install_dir")
                ACTIONS+=("clone_repo")
            fi
            ;;
        3)
            [[ "$IN_REPO" != "true" ]] && return
            check_sudo
            set_paths_system
            [[ -d "$INSTALL_DIR" ]] && ACTIONS+=("delete_install_dir")
            ACTIONS+=("copy_repo")
            ;;
        0)
            return
            ;;
        *)
            return
            ;;
    esac

    ACTIONS+=("venv" "run_script" "launcher" "desktop" "icon" "marker")
    confirm "Proceed?" Y && run_actions
}


### MAIN MENU

main_menu() {
    if [[ "$EXISTING" == "package" && "$TEST_MODE" != "true" ]]; then
        warn "Managed by package manager. Use your OS tools."
        exit 0
    fi

    echo -e "  ${BOLD}Action:${NC}"
    if [[ "$EXISTING" == "script-system" || "$EXISTING" == "script-user" || "$EXISTING" == "script-local" ]]; then
        echo -e "  1) Update"
        echo -e "  2) Reinstall"
        echo -e "  3) Uninstall"
        echo -e "  0) Quit"
        while true; do
            read -rp "  Select: " c
            case "$c" in
                1) check_online; if [[ "$ONLINE" == "true" ]]; then ACTIONS=("update"); run_actions; else error "Offline"; fi; return ;;
                2) do_reinstall; return ;;
                3) if [[ "$EXISTING" == "script-system" ]]; then check_sudo; fi; ACTIONS=("uninstall"); run_actions; return ;;
                0) exit 0 ;;
            esac
        done
    else
        echo -e "  1) Quick Install"
        echo -e "  2) Custom Install"
        echo -e "  0) Quit"
        while true; do
            read -rp "  Select: " c
            case "$c" in
                1) quick_install; return ;;
                2) custom_install; return ;;
                0) exit 0 ;;
            esac
        done
    fi
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --auto) AUTO_MODE=true; shift ;;
            --user) CLI_INSTALL_TYPE="user"; shift ;;
            --system) CLI_INSTALL_TYPE="system"; shift ;;
            --testmode|-t) TEST_MODE=true; shift ;;
            --help|-h) echo "Usage: $0 [-t] [--auto] [--user|--system]"; exit 0 ;;
            *) error "Unknown: $1"; exit 1 ;;
        esac
    done
}

main() {
    parse_args "$@"

    if [[ "$TEST_MODE" == "true" ]]; then
        APP_NAME="hyprsettings-test"; DESKTOP_NAME="HyprSettings (Test)"
    else
        APP_NAME="hyprsettings"; DESKTOP_NAME="HyprSettings"
    fi

    # CORRECTED LOGIC: Checks if input is a TTY properly
    if [[ ! -t 0 ]]; then
        if [[ -e /dev/tty ]]; then exec < /dev/tty; else AUTO_MODE=true; fi
    fi

    startup_checks

    if [[ "$AUTO_MODE" == "true" ]]; then
        if [[ "$EXISTING" != "none" && "$EXISTING" != "in-repo-uninstalled" ]]; then
             error "Already installed."
             exit 1
        fi
        quick_install
        exit 0
    fi

    main_menu
}

main "$@"