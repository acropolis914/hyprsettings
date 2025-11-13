## Tag Release v0.1.7
- You are now able to add keys and comments!
>[!Note] This update does not bring the full ability to adding but it brings the basic adding feature. For grouped keys, a selector is yet to be added so for 0.1.7, adding a sibling config will choose randomly from its set(lol sorry)

### Bug fixes
- When DMABUF renderer is disabled, the onboarding has no background. Made backround opaque instead.
- Generic item value editor not saving unless you press enter. Now autoupdates.

Developer life update: Whole province still no electricity. I was forced to buy a generator which costed me like 400USD. I don't have money tbh(I'm currently a student), I loaned some for it cause my fam needs it. oh well haha. I'd love me some donations if there's people willing to but it's very optional. I'm just glad seeing people giving this project an attention. It's great. Really, thank you!

## v0.1.6r35.g8a35f03
- Made comments above keys, bind to the keys directly below them.
- Transferred pywebview cache folder to .cache/hyprsettings
Added descriptions, if available, to tooltips. Sourced from sconfigdescriptions.hpp from hyprland repo

# Release v0.1.6

Globbing support has been added to the hyprland source option!

Previously, you could only specify direct relative file paths. Now, you can use globbing patterns—meaning things like ~/ will expand to your home directory and /* will match all files in a directory. The app will automatically find all files matching those patterns when setting the hyprland source.

This update is crucial for anyone managing multiple source files. Please update so the UI can now properly show and parse all your source files, making it much easier to manage complex setups.