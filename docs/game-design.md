# Game design reference

## Identity

Operation Honkdown: massive battles, total bird-brained chaos. Tactical, geared chickens fight across bright pastel urban streets. Low-poly silhouettes, frantic honking, flapping wings, high recoil, and dramatic ragdolls make the game funny without compromising readable shooting. All player-facing language is English.

## Chicken team appearance

The approved chicken uses a simple solid low-poly beak and bare feathered torso. Each round the friendly/player team is yellow; the opposing team's feathers are randomly green, red or blue. The chosen color stays fixed through respawns and corpse presentation, and matches safe-zone markings, tracers and HUD team names. Map generation and simulation seeds are independent of this visual color choice.

## Match flow

Main menu → select map/loadout → join → map loads and player spawns at the team start → 20-second countdown → bots on both teams use varied routes toward the central objective → combat until capture or ticket exhaustion → damage/kills/healing/deaths leaderboards → XP and money → main menu.

Each team begins with 200 tickets. Initial spawns are free; each respawn consumes one ticket, and a team reaching zero tickets ends the round immediately. Simultaneous ticket exhaustion is a draw. Player and bots become eligible to respawn after 20 seconds. A teammate may start a 4-second revive before respawn; it restores 50% health at the team starting point and costs no ticket. Completing a revive removes that death's corpse immediately. Otherwise a body remains for up to 30 seconds, including after its bot respawns. Player death controls and the live bird's-eye loadout screen are part of Phase 10.

The Phase 10 player interaction starts a teammate revive by holding F within 2.5 m of the corpse for their current death. The range includes vertical distance; older corpses left after respawn cannot anchor a new revive. Releasing F, moving out of range, changing targets, or dying cancels the revive. The local player shares the match's authoritative hit targets and lifecycle rules; after the 20-second respawn timer, the player returns automatically to the friendly spawn and spends one team ticket. The in-app browser did not support pointer lock during implementation review, so movement, death, and revive interaction still need a human playtest.

The source calls this capture the flag but describes a single central capture point. One team must control it for 30 seconds. A contest pauses both teams' progress, and earned progress persists through contested or neutral time. Completing the capture ends the round.

## Phase 10 menu and placeholder progression

The main menu has Loadout, Settings, Maps, and Skill tree tabs. The current loadout includes the Honk-47 primary and a tactical knife; more weapons and class effects are future work. Midtown and Garden District are selectable seeded city presets. Look sensitivity is saved locally and applies immediately.

The ready-room footer also has a direct Shooting range action. It opens the former movement test map as a training area with three firing lanes and nine chicken targets at 10 m, 15 m, and 20 m, plus movement obstacles, a ramp, and cover. Targets stand back up after 1.6 seconds; Reset range restores target positions, weapon/grenade supplies, and local hit statistics. The HUD shows shots, hits, accuracy, damage from bullets and grenades, knockdowns, and remaining targets. The range does not advance match rewards or tickets.

The user selected a simple placeholder economy. Until human review changes it, each completed round awards 100 base XP, +25 XP per kill, +1 XP per 10 damage, and +20 XP per revive; credits add 50 per round, +10 per kill, and +25 per revive. Field Notes costs 250 credits and adds 25% XP; Scrounger costs 400 credits and adds 25% credits. Bonuses round down to whole points. These skills only affect progression and are not final balance decisions.

Match results show top-five damage, kills, healing, and deaths leaderboards, followed by a separate rewards screen. Healing counts health restored by revives and is credited to the reviver. A versioned local profile records settings, selected map, XP, credits, skills, and the latest 100 rewarded match IDs so a result cannot pay twice.

The round countdown appears prominently at the top center. Each team's safe spawn region has half its original area (half the width, full map depth), marked with a tinted floor and boundary line. All bots initially spawn and later respawn inside their team's smaller region. Team members are protected from damage while their feet are inside their own zone, including after respawn. Before the round starts the player can move and jump inside the zone but cannot cross its boundary; attacks are disabled until the countdown completes. Bots slowly wander around their spawn anchors during countdown at up to 0.75 m/s, respecting world collision and staying fully inside the safe region; they do not fire. They ignore protected targets once combat starts.

The compact shooter HUD has a circular north-up squad radar at top left, tickets and objective control/progress at top center, health and safe-zone status at bottom left, and weapon, magazine/reserve ammunition, reload status and a rifle symbol at bottom right. Grenade inventory sits above the ammo counter with a filling circular restock indicator and seconds remaining. Revive instructions appear near the bottom center. Shooting-range statistics remain compact; Reset range is in the Escape menu.

The knife gives a 25% walking/sprinting/crouching movement boost while equipped. Wheel switching in either direction takes 0.5 seconds, blocks attacks during the transition, cancels a rifle reload and puts away grenades. Left mouse stabs for 55 damage within 2 m, with a 0.6-second attack cooldown; it does not consume rifle ammo. Respawn restores the rifle. Grenade visuals use a faceted olive body, collar, lever and pin ring, followed by an expanding/fading cartoon fire-and-smoke puff burst. A spent grenade is replenished every 30 seconds of simulation time, one at a time up to two carried grenades. The timer starts when inventory first drops below two, keeps progressing if the second grenade is thrown, pauses with the game, and resets when full or on respawn. The timer also advances while the player is dead. Nearby explosions shake the living player's camera within 12.6 m, with distance falloff. Corpses have repeating rising/fading Z and ZZZ letters until removed.

 Wounded players see a light red edge vignette that grows with missing health and clears at full health or death. While dead, a compact bottom panel leaves the live map unblurred; mouse wheel zooms in/out, with camera height bounded between 25 m and 180 m and reset to 90 m for each death.

Results open even when the player is dead. Escape keeps the ready room and completed-round screens paused. The live death view exists, but changing loadout from that screen remains unimplemented; Honk-47 is currently the only available primary.

## Controls

| Input | Behavior |
| --- | --- |
| WASD | Move |
| Mouse | Look |
| Mouse wheel while alive | Switch rifle/knife; 0.5-second equip delay |
| Mouse wheel while dead | Zoom the live bird’s-eye map |
| Space | Jump |
| Right mouse, held | Aim/zoom; mouse sensitivity reduced by 20% |
| Left mouse | Shoot, stab with knife, or throw when grenade equipped |
| Shift, held | Sprint |
| C, held | Crouch; pressing while sprinting slides |
| R | Reload |
| F | Interact/open doors/revive; enter vehicles in future |
| G | Equip grenade and show predicted arc |
| Q / E | Hold to lean the body left/right and peek around cover |
| Escape | Pause and show resume/settings/tools menu |
| Second Space press | Boosted double jump if class allows |
| Space against wall after jumping | Wall jump with speed boost if class allows |

Crouch defaults to hold; the controller also supports a configurable toggle mode. The Phase 3 movement test class enables boosted double jump and wall jump so both can be evaluated. Final class assignments remain open for later class/progression design. Jump timing windows, grenade cancellation, and control rebinding should be defined during the relevant input/UI work.

Leaning pivots the body around planted feet by up to 0.28 radians. Camera, rifle, and first-person wings move together: approximately 44 cm sideways while standing or 28 cm crouched, with a small natural eye-height drop. Collision clearance limits the lean beside walls, raised terrain, and world edges, including while turning and during render interpolation. The upper hit volume follows the tilt, so an exposed player can receive return fire; bots aim at the leaned upper body. Releasing Q/E recenters, holding both cancels the lean, and respawn resets it.

## Sound and audio settings

Master volume and effects volume are saved with the local profile and apply immediately. Audio starts after the first pointer or keyboard gesture. Combat playback covers gunshots, nearby explosions, reloads, hit feedback, player footsteps, UI clicks, and short bot knockout honks; spatial effects use distance and stereo position with a bounded voice count.

Sound files are supplied by the user and listed in `public/audio/manifest.json` with a local filename, source, and license for each clip. The manifest currently has no clips, so this implementation remains silent until approved files are added. Expected event names are `gunshot`, `explosion`, `honk`, `reload`, `footstep`, `hit`, and `ui`; missing entries do not request a file or interrupt gameplay.

## City and tools

Dense tiled urban city with predefined paths and randomly selected edge-to-edge buildings. Street ground becomes asphalt automatically. Concrete sidewalks and shallow curbs follow the outside of connected building blocks, including corners; shared building walls have no intervening walkway. White dashed lane centers follow connected roads and leave junction centers clear. Decoration includes trees, cafes, fountains, and wall-leaning bikes. Keep open routes wide enough for crowds. Buildings, collision, doors, slopes, and navigation must agree.

The map editor paints cells on a top-down flat grid: blue houses, yellow enterable houses with N/S, W/E, or all-side doors, green elevation. Elevation boundaries generate slopes automatically. Asset viewer is a separate app reachable from Escape, used to inspect code-generated content and both visual LOD tiers.

## Combat, bots, and presentation

The Honk-47 uses a dark tactical silhouette with a curved magazine and tube red-dot optic. Held aiming smoothly brings the optical axis to screen center so the player looks through the clear sight opening at its red dot. Reload lowers the sight before returning to held aim.

Satisfying detailed guns, firing/reload animation, reliable hit registration, health/death/revive, hit flashes, short hit freeze, small knockback, and nearby-explosion shake. Bots navigate, choose alternate routes, target enemies with imperfect accuracy, avoid overwhelming enemy groups, and seek cover when hurt. Off-screen battles continue in cheaper simulation.

Rendering uses two visual LOD tiers: close detail and far detail suitable for top-down views. Profile culling, batching, instancing, bot schedules, debris, and ragdolls against the 100+ bot target.

## Expansion

The planned giant bird plane ability is earned with kills: third-person aerial control, red x-ray enemy highlights, diving minigun attacks, and explosive bird-dropping bombs. Later ideas include night/heat vision, a small drone, sandbags, extra weapons/classes, and vehicles. Sound files will be supplied by the user.
