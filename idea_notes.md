*Short description:*
“””Massive battles. Total bird-brained chaos.
This is a chaotic, low-poly FPS where hundreds of fully geared tactical birds clash across bright sprawling urban battlefields. Lock and load alongside swarms of bots, customize your loadout and dive into high intensity, squad based warfare where team communication ist mostly frantic honking and panicked ragdoll physics”””

*Development:*
Development is split into phases. Each Phase adds a new Feature or has another task like optimizing
Coding agents will work and develop the features. I'm just reviewing the code and give the direction and suggestions



*Agent guidelines:*
agent.md is basically the readme for the agnetic coding models that work on this project. Inside: A short description of the project and its goal (very short) and then it says whats inside each doc file (like plan.md, tracker.md, handoff.md, and so on) and tells it to read them to get the needed context to continue working on this project. This way I will only need to tell the agent “Read agent.md first. Then do this / implement that”.
plan.md contains the whole plan, all phases from start to finish and its sub-steps.
tracker.md keeps track of the current progress, what is skipped, what needs revision, etc. This way plan md stays clean and isnt polluted by notes. Tracker md only states the current progress in detailed way = if we are working on phase 10 and 1-7 are long done, it just says phase 1-7 are done, tested and verified by the user, it does not need to continue stating every little detail and long solved problem we had on the way.
handoff.md is written after each agent is done. It is a short info what was done last and where the agent left off. Enough details so the next agent can pick up work and continue tha plan / has enough understand to interfere with that if it needs to do something else instead of the next thing in the plan.
For every feature the agent should write a test and also rerun all earlier tests to make sure that nothing else broke while implementing the new feature
After implementing the feature, testing it and maybe reiterating, commit to git

*Goal*
A fun and bright game, that doesn't take itself too serious
Mass scale warfare: Fight in 100+ bot battles
Tactical gear: Nigh vision, heat vision, etc
Low poly destruction
Comedy like physics: High recoil guns that throw the player / bots through the battleground, wing flapping when jumping, dramatic ragdoll animations
hilarious gameplay

*Game loop*
Main screen (with loadout tab, setting tab, map selection tab, skil tree)
Press join round
map loads & player spawns at starting point & round start countdown 20 secs starts
both teams (bots rush to the capture point in the middle of the map (using different ways to get there)
Basically capture the flag, very similar to “Battlebits remastered”
if player dies, sees a birds eye live view of the map and can change loadout
after 20 seconds the player can spawn at starting point again
the enemies and team member respawn after 20 seconds aswell
the round ends if the capture point is captured, or one of teams tickets is used up (each team hast 200 tickets, one respawn = 1 ticket)
after round: 4 leaderboards: most dmg, most kills, most healing, most deaths
next screen shows exp gained and money received
back to main menu
next round

*Environment & Feel*
urban city, not dark but bright pastel colors, low poly look
a lot of decoration like trees, cafes, fountains, bikes leaning against the walls, etc
but still not too crowded, so 100 bots have enough space to rush through there
similar to “battlebits remastered”
basically a typical shooter like CoD but with funny chicken and brighter colors and comedy cranked to the max
hit flash, short hit freeze, small amount of knockback, screenshake when explosion nearby

*Controls*
wasd for movement
space for jumping
mouse for camera
right click for aiming (zoom in, 20% slower mouse movement, holding)
left click for shooting
shift for sprinting (holding)
c for crouching
r for reload
f for interact (opening doors, reviving someone, entering a car/plane (later expansion)
g for equipping grenade (then left mouse to throw, throw path (arc) is visible when equipped)
q and e to lean left and right
escape pauses the game and shows a typical menu (resume, settings, etc)
if class allows: double space = double jump (second jump is boosted)
if class allows: jumping at a wall and then hitting space again = wall jump + speed boost
when sprinting and pressing c you the player makes a slide

*Technical stuff*
language English
programming language typescript, three.js
Use LODs (2 tiers, one for close and for far away for top-down view (drone, plane, etc)
only render the stuff around the player or what the player could see, but somehow keep track of where the other bots are and continue simulating their fighting in a fast and cheap way, even if they are not on the screen and rendered
assets are written in typescript
all weapons should be their own file and have a defined structure. This way its very easy to add weapons later. They should also all be inside a dedicated folder and read at the start of the game 

*The map*
The map is a dense urban city
the “paths” are pre-defined, the buildings are randomly chosen out of a pool, more or less a grid system, and the predefined cells are filled with random houses that go edge to edge like New York. Tile like system
the decoration is then near-randomly placed (from a pool) around the map in the open spaces (but also with some simple logical rules)
a simple map editor: a top-down view of an empty flat plane with squares/cells. I can draw and fill cells with one color each. Blue = houses, yellow = houses that you can go into and have doors on 2 sides (multiples variants: north and south, west and east, on all sides), green = elevation (at the edge between elevation and no elevation automatically add a slope tile)

*Phases*
Project foundation: setup, folder creation, git init, doc creation, etc
Core engine shell
Player movement, create empty flat placeholder map for testing and refining movement
Detailed gun model creation, detailed shooting and reloading animations, shooting should feel satisfying. Implement the hit registration, health, dying and reviving and respawning
Asset pipeline and Asset viewer. Generate low quality assets as placeholders. Create an Asset viewer (extra app, can be started from esc menu)
Map generation. Create the simple editor. Get map generation working with simple placeholder assets
Revision and fixing/improving the high quality assets
Player character: low-poly cartoony chicken
Bot logic & navigation (path finding, automatically shooting at enemy, keeping distance if there are too many enemies, finding cover when low health, shooting at enemies with not perfect hit rate (induce randomnes)
Match loop, respawn, revive, tickets
UI/UX & progression shell: Connect menus to the game loop
High quality asset generation. Generate and refine with my feedback.
Comedy physics & low-poly destruction
Performance & mass scale. Goal: 100+ bots at stable performance.LODs in real gameplay, 2 tiers. Culling, instancing, batching. Off-screen bot simulation that is cheap but keeps battles going. Profiling, memory optimization, network-free scaling. Stress tests with 100+ bots.
Sound design. I will download some soundfiles that we can use (chicken sounds, various gunshot sounds, etc)
At this stage the base should be already done. Quality control
Plane ability: Add the plane ability. If the player has enough kills he can activate the plane ability. You take control of a big autonomous drone and fly it in third person above the city. All enemies are highlighted xray like in red. Dive bomb to shoot them with miniguns or drop bombs. (The drone is actually a big bird, and bombs are big drops of bird shit that explode like a real fiery explosion
QC, balance, playtesting, bug fixing

*Extras*
When a bot dies, the body ragdolls and stays 30 seconds before finally disappearing and respawning. The player can revive the bot (takes 4 seconds) and the bot directly respawns at that spot again with 50% health and continues fighting. No ticket is deducted.

*Future additions / features*
night vision googles
small drone
being able to place sandbags
more weapon types and classes


