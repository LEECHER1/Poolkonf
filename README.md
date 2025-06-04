Pool Konfigurator Code von Cinema4D
-- coding: utf-8 --
""" Cinema 4D Python_Generator – Pool + Schacht + Stein-Instanzen + Boden + Einbauteile """

import c4d from c4d import Vector import c4d.utils # DegToRad, MODE_OFF / MODE_ON

------------------------------------------------------------------
Grundparameter (POOL / SCHACHT)
------------------------------------------------------------------
POOL_X, POOL_Z, POOL_Y = 800.0, 400.0, 150.0 # Innenmaße Pool SHAFT_X, SHAFT_Z, SHAFT_Y = 125.0, POOL_Z, 150.0 # Innenmaße Schacht SHAFT_SIDE = "right" # "left" oder "right"

BLOCK_FULL = 100.0 BLOCK_HEIGHT = 25.0 BLOCK_STEP = 25.0 ADD_CORNERS = True STONE_COLOR = Vector(0.65, 0.85, 1.0)

USE_INSTANCES = True # Steine als Instanz?

------------------------------------------------------------------
Bodenparameter
------------------------------------------------------------------
FLOOR_THICKNESS = 5.0 FLOOR_COLOR = Vector(0.8, 0.8, 0.9) SHAFT_FLOOR_REDUCE_AT_POOL = 25.0 # Schachtboden an Poolseite kürzen

------------------------------------------------------------------
Sichtbarkeit Einbauteile
------------------------------------------------------------------
SHOW_FITTINGS = True # ← EIN/AUS für alle Einlaufdüsen, Skimmer & Bodenablauf

Positionsparameter (einfach anpassen)
INLET_Y = POOL_Y * 0.5 # Höhe der Einlaufdüsen INLET_Z_OFF = (-POOL_Z0.25, 0, POOL_Z0.25, POOL_Z*0.4) # max. 4 Düsen

SKIMMER_Y = POOL_Y - 10 # knapp unter Oberkante SKIMMER_Z_OFF = (-POOL_Z0.2, POOL_Z0.2, POOL_Z*0.0) # max. 3 Skimmer

DRAIN_Y = 0 # Bodenablauf am Poolboden DRAIN_Z_OFF = (0,) # immer mittig

------------------------------------------------------------------
Stein-Datenbank (Länge, Höhe) → Objektname
------------------------------------------------------------------
STONE_LOOKUP = { (100, 25): "Stein1-100x25x25", (125, 30): "Stein2-125x30x25", (25, 25): "Stein3-25x25", (50, 25): "Stein4-50x25", (75, 25): "Stein5-75x25", (25, 30): "Stein6-25x30", (50, 30): "Stein7-50x30", (75, 30): "Stein8-75x30", (100, 30): "Stein9-100x30" }

------------------------------------------------------------------
Hilfsfunktionen (Stein / Instanz / Würfel)
------------------------------------------------------------------
def _get_stone_source(length, height): name = STONE_LOOKUP.get((length, height)) if not name: raise ValueError(f"Kein Stein für {length}×{height} cm definiert") obj = doc.SearchObject(name) if not obj: raise RuntimeError(f"Objekt „{name}“ nicht im Dokument gefunden") return obj

def _create_instance(length, height, pos, parent): inst = c4d.BaseObject(c4d.Oinstance) inst[c4d.INSTANCEOBJECT_LINK] = _get_stone_source(length, height) inst.SetAbsPos(pos) inst.InsertUnder(parent) return inst

def _create_cube(length, axis, pos, parent): size = Vector(length, BLOCK_HEIGHT, BLOCK_STEP) if axis == "x" else Vector(BLOCK_STEP, BLOCK_HEIGHT, length) cube = c4d.BaseObject(c4d.Ocube) cube[c4d.PRIM_CUBE_LEN] = size cube[c4d.ID_BASEOBJECT_USECOLOR] = 2 cube[c4d.ID_BASEOBJECT_COLOR] = STONE_COLOR cube.SetAbsPos(pos) cube.InsertUnder(parent) return cube

------------------------------------------------------------------
Block platzieren – inkl. 90°-Drehung bei Seitenwänden
------------------------------------------------------------------
def place_block(length, axis, pos, parent): obj = _create_instance(length, BLOCK_HEIGHT, pos, parent) if USE_INSTANCES
else _create_cube(length, axis, pos, parent) if axis == "z": # Seitenwand → Heading +90° obj.SetRelRot(Vector(c4d.utils.DegToRad(90), 0, 0)) return obj

------------------------------------------------------------------
Geometrie-Helfer (split / pack / build ...)
------------------------------------------------------------------
def split_len(total): seg, rest = [], total for s in (100, 75, 50, 25): while rest >= s - 0.01: seg.append(float(s)); rest -= s if rest > 0.01: seg.append(float(rest)) return seg

def pack_blocks(seg): stones = free = 0 for piece in seg: need = piece while need > 0: if free == 0: stones += 1; free = BLOCK_FULL take = min(need, free) free -= take; need -= take return stones

def build_wall(holder, axis, half_len, fixed, seg, layers): for ly in range(layers): y = BLOCK_HEIGHT0.5 + lyBLOCK_HEIGHT cur = -half_len for s in seg: pos = Vector(cur+s0.5, y, fixed) if axis == "x" else Vector(fixed, y, cur+s0.5) place_block(s, axis, pos, holder) cur += s

def add_corners_pool(root, layers, hx, hz): if not ADD_CORNERS: return for ly in range(layers): y = BLOCK_HEIGHT0.5 + lyBLOCK_HEIGHT for sx in (-1,1): for sz in (-1,1): pos = Vector(sx*(hx+BLOCK_STEP0.5), y, sz(hz+BLOCK_STEP*0.5)) place_block(BLOCK_STEP, "x", pos, root)

def add_corners_shaft(root, layers, shaft_cx, sign, shx, zf, zb, y_offset): if not ADD_CORNERS: return xc = shaft_cx + sign*(shx+BLOCK_STEP0.5) for ly in range(layers): y = BLOCK_HEIGHT0.5 + ly*BLOCK_HEIGHT + y_offset for zc in (zf, zb): pos = Vector(xc, y, zc) place_block(BLOCK_STEP, "x", pos, root)

------------------------------------------------------------------
Bodenplatte
------------------------------------------------------------------
def _create_floor(parent, size_x, size_z, pos, name): floor = c4d.BaseObject(c4d.Ocube) floor[c4d.PRIM_CUBE_LEN] = Vector(size_x, FLOOR_THICKNESS, size_z) floor[c4d.ID_BASEOBJECT_USECOLOR] = 2 floor[c4d.ID_BASEOBJECT_COLOR] = FLOOR_COLOR floor.SetAbsPos(pos) floor.SetName(name) floor.InsertUnder(parent) return floor

------------------------------------------------------------------
Einbauteile positionieren
------------------------------------------------------------------
def _place_fitting_series(base_name, z_offsets, y, x_const, group): """ base_name: "Einlaufduese", "Skimmer", "Bodenablauf" z_offsets: Iterable relativer Z-Werte (ab Szenenzentrum) y : absolute Y-Position x_const : absolute X-Position (Schacht-Wand) """ for idx, z_off in enumerate(z_offsets, start=1): obj = doc.SearchObject(f"{base_name}{idx}") if not obj: continue # fehlendes Objekt ignorieren obj.InsertUnder(group) obj.SetAbsPos(Vector(x_const, y, z_off))

------------------------------------------------------------------
MAIN / Generator
------------------------------------------------------------------
def main(): pool_layers = int(round(POOL_Y / BLOCK_HEIGHT)) shaft_layers = int(round(SHAFT_Y / BLOCK_HEIGHT))

pool_seg_x,  pool_seg_z  = split_len(POOL_X),  split_len(POOL_Z)
shaft_seg_x, shaft_seg_z = split_len(SHAFT_X), split_len(SHAFT_Z)

pool_layer  = pool_seg_x*2 + pool_seg_z*2 + ([25]*4 if ADD_CORNERS else [])
shaft_layer = shaft_seg_x*2 + shaft_seg_z  + ([25]*2 if ADD_CORNERS else [])

pool_stones  = pack_blocks(pool_layer) * pool_layers
shaft_stones = pack_blocks(shaft_layer * shaft_layers)
stones_total = pool_stones + shaft_stones

# Root-Setup
root   = c4d.BaseObject(c4d.Onull)
layout = c4d.BaseObject(c4d.Onull); layout.SetName("BlockLayout"); layout.InsertUnder(root)

# ► Pool-Wände
hx, hz = POOL_X*0.5, POOL_Z*0.5
zf, zb = hz+BLOCK_STEP*0.5, -(hz+BLOCK_STEP*0.5)
xl, xr = -(hx+BLOCK_STEP*0.5), hx+BLOCK_STEP*0.5

pool_axes = {"Pool_Vorne":"x","Pool_Hinten":"x","Pool_Links":"z","Pool_Rechts":"z"}
for n, ax in pool_axes.items():
    holder = c4d.BaseObject(c4d.Onull); holder.SetName(n); holder.InsertUnder(layout)
    build_wall(
        holder, ax,
        hx if ax=="x" else hz,
        zf if n.endswith("Vorne") else zb if n.endswith("Hinten") else xl if n.endswith("Links") else xr,
        pool_seg_x if ax=="x" else pool_seg_z,
        pool_layers
    )
add_corners_pool(layout, pool_layers, hx, hz)

# ► Schacht-Wände
sign      = 1 if SHAFT_SIDE.lower()=="right" else -1
shaft_cx  = sign*(hx + BLOCK_STEP + SHAFT_X*0.5)
y_offset  = -(SHAFT_Y - POOL_Y) if SHAFT_Y > POOL_Y else 0

shaft_root = c4d.BaseObject(c4d.Onull)
shaft_root.SetName("Schacht")
shaft_root.SetAbsPos(Vector(shaft_cx, y_offset, 0))
shaft_root.InsertUnder(layout)

shx, shz = SHAFT_X*0.5, SHAFT_Z*0.5
build_wall(shaft_root,"x",shx,zf,shaft_seg_x,shaft_layers)
build_wall(shaft_root,"x",shx,zb,shaft_seg_x,shaft_layers)
build_wall(shaft_root,"z",shz,sign*(shx+BLOCK_STEP*0.5),shaft_seg_z,shaft_layers)
add_corners_shaft(layout,shaft_layers,shaft_cx,sign,shx,zf,zb,y_offset)

# ► Bodenplatten
_create_floor(
    layout,
    POOL_X + 2*BLOCK_STEP,
    POOL_Z + 2*BLOCK_STEP,
    Vector(0, -FLOOR_THICKNESS*0.5, 0),
    "Pool_Boden"
)
_create_floor(
    layout,
    SHAFT_X + 2*BLOCK_STEP - SHAFT_FLOOR_REDUCE_AT_POOL,
    SHAFT_Z + 2*BLOCK_STEP,
    Vector(shaft_cx + sign*(SHAFT_FLOOR_REDUCE_AT_POOL*0.5), y_offset - FLOOR_THICKNESS*0.5, 0),
    "Schacht_Boden"
)

# ------------------------------------------------------------------
# ► Einbauteile
# ------------------------------------------------------------------
fittings_grp = doc.SearchObject("Einbauteilen")
if not fittings_grp:
    fittings_grp = c4d.BaseObject(c4d.Onull)
    fittings_grp.SetName("Einbauteilen")
    fittings_grp.InsertUnder(layout)

# Sichtbarkeit global toggeln
mode = c4d.MODE_ON if SHOW_FITTINGS else c4d.MODE_OFF
fittings_grp.SetEditorMode(mode)
fittings_grp.SetRenderMode(mode)

if SHOW_FITTINGS:
    # Gemeinsame X-Position: Innenfläche Schacht-Wand
    x_fit = sign*(hx - BLOCK_STEP*0.5)

    # Einlaufdüsen (max. 4)
    _place_fitting_series("Einlaufduese",
                          INLET_Z_OFF[:4],
                          INLET_Y,
                          x_fit,
                          fittings_grp)

    # Skimmer (max. 3)
    _place_fitting_series("Skimmer",
                          SKIMMER_Z_OFF[:3],
                          SKIMMER_Y,
                          x_fit,
                          fittings_grp)

    # Bodenablauf (immer 1, mittig)
    _place_fitting_series("Bodenablauf",
                          DRAIN_Z_OFF,
                          DRAIN_Y,
                          x_fit,
                          fittings_grp)

# ------------------------------------------------------------------
# ► Name des Generator-Objekts
# ------------------------------------------------------------------
try:
    op.SetName(
        f"Pool {int(POOL_X)}×{int(POOL_Z)}×{int(POOL_Y)} cm = {pool_stones} | "
        f"Schacht {int(SHAFT_X)}×{int(SHAFT_Z)}×{int(SHAFT_Y)} cm = {shaft_stones} | "
        f"Gesamt = {stones_total}"
    )
except NameError:
    pass

return root
