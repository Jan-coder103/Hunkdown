# Game design reference

## Identity

Operation Honkdown: massive battles, total bird-brained chaos. Tactical, geared chickens fight across bright pastel urban streets. Low-poly silhouettes, frantic honking, flapping wings, high recoil, and dramatic ragdolls make the game funny without compromising readable shooting. All player-facing language is English.

## Match flow

Main menu → select map/loadout → join → map loads and player spawns at the team start → 20-second countdown → bots on both teams use varied routes toward the central objective → combat until capture or ticket exhaustion → damage/kills/healing/deaths leaderboards → XP and money → main menu.

Each team begins with 200 tickets. Each respawn consumes one ticket; revives consume none. Player and bots become eligible to respawn after 20 seconds. While dead, the player sees a live bird's-eye map and can change loadout. Spawn location is the team starting point. Reviving a dead bot takes 4 seconds and returns it at that location with 50% health. Dead bots ragdoll; bodies remain visually for up to 30 seconds. The exact relationship between respawn, revive eligibility, and corpse cleanup needs confirmation; see tracker.

The source calls this capture the flag but describes a single capture point; capture rules are still open.

## Controls

| Input | Behavior |
| --- | --- |
| WASD | Move |
| Mouse | Look |
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

## City and tools

Dense tiled urban city with predefined paths and randomly selected edge-to-edge buildings. Decoration includes trees, cafes, fountains, and wall-leaning bikes. Keep open routes wide enough for crowds. Buildings, collision, doors, slopes, and navigation must agree.

The map editor paints cells on a top-down flat grid: blue houses, yellow enterable houses with N/S, W/E, or all-side doors, green elevation. Elevation boundaries generate slopes automatically. Asset viewer is a separate app reachable from Escape, used to inspect code-generated content and both visual LOD tiers.

## Combat, bots, and presentation

Satisfying detailed guns, firing/reload animation, reliable hit registration, health/death/revive, hit flashes, short hit freeze, small knockback, and nearby-explosion shake. Bots navigate, choose alternate routes, target enemies with imperfect accuracy, avoid overwhelming enemy groups, and seek cover when hurt. Off-screen battles continue in cheaper simulation.

Rendering uses two visual LOD tiers: close detail and far detail suitable for top-down views. Profile culling, batching, instancing, bot schedules, debris, and ragdolls against the 100+ bot target.

## Expansion

The planned giant bird plane ability is earned with kills: third-person aerial control, red x-ray enemy highlights, diving minigun attacks, and explosive bird-dropping bombs. Later ideas include night/heat vision, a small drone, sandbags, extra weapons/classes, and vehicles. Sound files will be supplied by the user.
