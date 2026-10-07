# Game design reference

## Identity

Operation Honkdown: massive battles, total bird-brained chaos. Tactical, geared chickens fight across bright pastel urban streets. Low-poly silhouettes, frantic honking, flapping wings, high recoil, and dramatic ragdolls make the game funny without compromising readable shooting. All player-facing language is English.

## Match flow

Main menu → select map/loadout → join → map loads and player spawns at the team start → 20-second countdown → bots on both teams use varied routes toward the central objective → combat until capture or ticket exhaustion → damage/kills/healing/deaths leaderboards → XP and money → main menu.

Each team begins with 200 tickets. Initial spawns are free; each respawn consumes one ticket, and a team reaching zero tickets ends the round immediately. Simultaneous ticket exhaustion is a draw. Player and bots become eligible to respawn after 20 seconds. A teammate may start a 4-second revive before respawn; it restores 50% health at the team starting point and costs no ticket. Completing a revive removes that death's corpse immediately. Otherwise a body remains for up to 30 seconds, including after its bot respawns. Player death controls and the live bird's-eye loadout screen are part of Phase 10.

The Phase 10 player interaction starts a teammate revive by holding F within 2.5 m of the corpse for their current death. The range includes vertical distance; older corpses left after respawn cannot anchor a new revive. Releasing F, moving out of range, changing targets, or dying cancels the revive. The local player shares the match's authoritative hit targets and lifecycle rules; after the 20-second respawn timer, the player returns automatically to the friendly spawn and spends one team ticket. The in-app browser did not support pointer lock during implementation review, so movement, death, and revive interaction still need a human playtest.

The source calls this capture the flag but describes a single central capture point. One team must control it for 30 seconds. A contest pauses both teams' progress, and earned progress persists through contested or neutral time. Completing the capture ends the round.

## Phase 10 menu and placeholder progression

The main menu has Loadout, Settings, Maps, and Skill tree tabs. The current loadout exposes the only implemented weapon, Honk-47; more weapons and class effects are future work. Midtown and Garden District are selectable seeded city presets. Look sensitivity is saved locally and applies immediately.

The ready-room footer also has a direct Shooting range action. It opens the former movement test map as a training area with three firing lanes and nine chicken targets at 10 m, 15 m, and 20 m, plus movement obstacles, a ramp, and cover. Targets stand back up after 1.6 seconds; Reset range restores target positions, weapon/grenade supplies, and local hit statistics. The HUD shows shots, hits, accuracy, damage from bullets and grenades, knockdowns, and remaining targets. The range does not advance match rewards or tickets.

The user selected a simple placeholder economy. Until human review changes it, each completed round awards 100 base XP, +25 XP per kill, +1 XP per 10 damage, and +20 XP per revive; credits add 50 per round, +10 per kill, and +25 per revive. Field Notes costs 250 credits and adds 25% XP; Scrounger costs 400 credits and adds 25% credits. Bonuses round down to whole points. These skills only affect progression and are not final balance decisions.

Match results show top-five damage, kills, healing, and deaths leaderboards, followed by a separate rewards screen. Healing counts health restored by revives and is credited to the reviver. A versioned local profile records settings, selected map, XP, credits, skills, and the latest 100 rewarded match IDs so a result cannot pay twice.

The round countdown appears at the top center. Wounded players see a light red edge vignette that grows with missing health and clears at full health or death. While dead, a compact bottom panel leaves the live map unblurred; mouse wheel zooms in/out, with camera height bounded between 25 m and 180 m and reset to 90 m for each death.

Results open even when the player is dead. Escape keeps the ready room and completed-round screens paused. The live death view exists, but changing loadout from that screen remains unimplemented; Honk-47 is currently the only available primary.

## Controls

| Input | Behavior |
| --- | --- |
| WASD | Move |
| Mouse | Look |
| Mouse wheel while dead | Zoom the live bird’s-eye map |
| Space | Jump |
| Right mouse, held | Aim/zoom; mouse sensitivity reduced by 20% |
| Left mouse | Shoot; throw when grenade equipped |
| Shift, held | Sprint |
| C, held | Crouch; pressing while sprinting slides |
| R | Reload |
| F | Interact/open doors/revive; enter vehicles in future |
| G | Equip grenade and show predicted arc |
| Q / E | Lean left/right |
| Escape | Pause and show resume/settings/tools menu |
| Second Space press | Boosted double jump if class allows |
| Space against wall after jumping | Wall jump with speed boost if class allows |

Crouch defaults to hold; the controller also supports a configurable toggle mode. The Phase 3 movement test class enables boosted double jump and wall jump so both can be evaluated. Final class assignments remain open for later class/progression design. Jump timing windows, grenade cancellation, and control rebinding should be defined during the relevant input/UI work.

## Sound and audio settings

Master volume and effects volume are saved with the local profile and apply immediately. Audio starts after the first pointer or keyboard gesture. Combat playback covers gunshots, nearby explosions, reloads, hit feedback, player footsteps, UI clicks, and short bot knockout honks; spatial effects use distance and stereo position with a bounded voice count.

Sound files are supplied by the user and listed in `public/audio/manifest.json` with a local filename, source, and license for each clip. The manifest currently has no clips, so this implementation remains silent until approved files are added. Expected event names are `gunshot`, `explosion`, `honk`, `reload`, `footstep`, `hit`, and `ui`; missing entries do not request a file or interrupt gameplay.

## City and tools

Dense tiled urban city with predefined paths and randomly selected edge-to-edge buildings. Decoration includes trees, cafes, fountains, and wall-leaning bikes. Keep open routes wide enough for crowds. Buildings, collision, doors, slopes, and navigation must agree.

The map editor paints cells on a top-down flat grid: blue houses, yellow enterable houses with N/S, W/E, or all-side doors, green elevation. Elevation boundaries generate slopes automatically. Asset viewer is a separate app reachable from Escape, used to inspect code-generated content and both visual LOD tiers.

## Combat, bots, and presentation

Satisfying detailed guns, firing/reload animation, reliable hit registration, health/death/revive, hit flashes, short hit freeze, small knockback, and nearby-explosion shake. Bots navigate, choose alternate routes, target enemies with imperfect accuracy, avoid overwhelming enemy groups, and seek cover when hurt. Off-screen battles continue in cheaper simulation.

Rendering uses two visual LOD tiers: close detail and far detail suitable for top-down views. Profile culling, batching, instancing, bot schedules, debris, and ragdolls against the 100+ bot target.

## Expansion

The planned giant bird plane ability is earned with kills: third-person aerial control, red x-ray enemy highlights, diving minigun attacks, and explosive bird-dropping bombs. Later ideas include night/heat vision, a small drone, sandbags, extra weapons/classes, and vehicles. Sound files will be supplied by the user.
