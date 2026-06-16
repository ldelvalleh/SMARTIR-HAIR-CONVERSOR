# SmartIR compatibility research

This document explains how `data/compatibility-index.json` should be interpreted.

## Goal

SmartIR usually exposes a model only when that model is listed in the upstream JSON file. In practice, many IR command sets also work with related models from the same manufacturer, model family, chassis generation or original remote-control family.

The compatibility index adds a second layer for the UI:

- exact SmartIR supported models;
- related models already grouped by SmartIR;
- candidate models that are worth testing when the exact model is not listed.

## Confidence levels

| Level | Meaning | UI wording suggestion |
|---|---|---|
| `confirmed_catalog` | The models appear together in the same SmartIR `supportedModels` list. SmartIR already treats them as sharing a command set. | `Compatible según catálogo SmartIR` |
| `probable_family` | The models are from the same manufacturer/family/protocol group, but every command has not been verified. | `Probablemente compatible` |
| `try_only` | There is enough relationship to make it useful as a test candidate, but not enough to claim compatibility. | `Puedes probarlo, no confirmado` |

## Compatibility scope

| Scope | Meaning |
|---|---|
| `listed_commands` | Applies only to the commands present in the SmartIR JSON file. |
| `power_only` | Use only for power/on/off style commands. Do not imply full remote compatibility. |
| `remote_model` | The value is a remote-control model, not a TV/device model. |

## Important Samsung note

Some newer Samsung TVs use Smart Remotes that pair with the TV, while still emitting infrared signals in some cases. Samsung's own support page tells users to check whether the Smart Remote emits infrared using a smartphone camera. Because of that, a SmartIR Samsung code may be a good candidate for testing, especially for power commands, but it should not automatically be shown as a confirmed full remote match.

Example: SmartIR `codes/media_player/1065.json` is listed for `QE65Q67RAUXRU` and contains only `on` and `off`. The model `QE55S95BATXXC` / `QE55S95BAT` should therefore be treated as `try_only` and `power_only`, not as confirmed full compatibility.

## Recommended UI behavior

When a user searches for a model that is not directly listed:

1. Normalize model text: uppercase, remove spaces, compare without regional suffix where safe.
2. Look for exact `supportedModels` in `data/index.json`.
3. If no exact match, look in `data/compatibility-index.json`.
4. Show compatibility grouped by confidence:
   - first `confirmed_catalog`;
   - then `probable_family`;
   - last `try_only` with a clear warning.
5. Show scope next to each result, especially `power_only`.

## Do not overpromise

Avoid UI text such as `compatible` for `try_only` entries. Use wording like:

> Este modelo no está confirmado, pero puedes probar estos códigos relacionados.

For IR, a close relationship can mean only some buttons work. The user should be able to mark a result as working/not working later so the index improves over time.
