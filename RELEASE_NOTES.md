# Release v0.1.6

Globbing support has been added to the hyprland source option!

Previously, you could only specify direct relative file paths. Now, you can use globbing patterns—meaning things like ~/ will expand to your home directory and /* will match all files in a directory. The app will automatically find all files matching those patterns when setting the hyprland source.

This update is crucial for anyone managing multiple source files. Please update so the UI can now properly show and parse all your source files, making it much easier to manage complex setups.