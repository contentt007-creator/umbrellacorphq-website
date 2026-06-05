# blender_renders.py
# ============================================================
# Umbrella Corp HQ — Product Render Script
# ============================================================
# Produces three product hero renders:
#   1. NNT_bag_hero.png   — styled bag shape
#   2. Warrior_RAM.png    — RAM stick with heatspreader
#   3. Warrior_SSD.png    — M.2-style SSD slab
#
# Run inside Blender's scripting tab, or via:
#   blender --background --python blender_renders.py
#
# Output: /renders/ folder relative to this script's location.
# ============================================================

import bpy
import os
import math


# ============================================================
# PATHS
# ============================================================

SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
RENDER_DIR = os.path.join(SCRIPT_DIR, "renders")
os.makedirs(RENDER_DIR, exist_ok=True)


# ============================================================
# HELPER: HEX → LINEAR RGB
# ============================================================

def hex_to_rgb(hex_str):
    """Convert a hex colour string like '#C0392B' to a linear-space (r, g, b, 1) tuple."""
    hex_str = hex_str.lstrip('#')
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    # Convert sRGB to linear (approximate gamma 2.2)
    def to_linear(c):
        return c ** 2.2
    return (to_linear(r), to_linear(g), to_linear(b), 1.0)


# ============================================================
# HELPER: CREATE MATERIAL
# ============================================================

def create_material(name, color_hex, metallic=0.0, roughness=0.5, emission=False, emission_strength=1.0):
    """
    Create or replace a material by name.
    If emission=True, uses an Emission shader instead of Principled BSDF.
    Returns the material.
    """
    # Remove existing material with same name to avoid duplicates between scenes
    if name in bpy.data.materials:
        bpy.data.materials.remove(bpy.data.materials[name], do_unlink=True)

    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    color_linear = hex_to_rgb(color_hex)

    if emission:
        # Emission shader
        emit_node = nodes.new(type='ShaderNodeEmission')
        emit_node.inputs['Color'].default_value = color_linear
        emit_node.inputs['Strength'].default_value = emission_strength

        output_node = nodes.new(type='ShaderNodeOutputMaterial')
        output_node.location = (300, 0)
        emit_node.location = (0, 0)
        links.new(emit_node.outputs['Emission'], output_node.inputs['Surface'])
    else:
        # Principled BSDF
        bsdf_node = nodes.new(type='ShaderNodeBsdfPrincipled')
        bsdf_node.inputs['Base Color'].default_value = color_linear
        bsdf_node.inputs['Metallic'].default_value = metallic
        bsdf_node.inputs['Roughness'].default_value = roughness
        bsdf_node.location = (0, 0)

        output_node = nodes.new(type='ShaderNodeOutputMaterial')
        output_node.location = (300, 0)
        links.new(bsdf_node.outputs['BSDF'], output_node.inputs['Surface'])

    return mat


# ============================================================
# HELPER: WHITE MATERIAL (for text)
# ============================================================

def create_white_material(name='mat_white'):
    """Simple white diffuse material."""
    if name in bpy.data.materials:
        bpy.data.materials.remove(bpy.data.materials[name], do_unlink=True)
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (1.0, 1.0, 1.0, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.0
    bsdf.inputs['Roughness'].default_value = 0.6
    bsdf.location = (0, 0)
    out = nodes.new(type='ShaderNodeOutputMaterial')
    out.location = (300, 0)
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


# ============================================================
# HELPER: ASSIGN MATERIAL TO OBJECT
# ============================================================

def assign_material(obj, mat):
    """Assign a material to an object, clearing existing slots first."""
    obj.data.materials.clear()
    obj.data.materials.append(mat)


# ============================================================
# HELPER: SETUP CAMERA
# ============================================================

def setup_camera(location, look_at=(0.0, 0.0, 0.0), focal_length=50):
    """
    Place (or create) the scene camera at 'location', pointed at 'look_at'.
    Uses a TRACK_TO constraint for accurate aim. Returns the camera object.
    """
    # Remove existing camera objects
    for obj in list(bpy.data.objects):
        if obj.type == 'CAMERA':
            bpy.data.objects.remove(obj, do_unlink=True)

    bpy.ops.object.camera_add(location=location)
    cam_obj = bpy.context.active_object
    cam_obj.name = "SceneCamera"
    cam_obj.data.lens = focal_length
    cam_obj.data.type = 'PERSP'

    # Point at target via a TRACK_TO constraint
    constraint = cam_obj.constraints.new(type='TRACK_TO')
    constraint.target = None  # we'll use a target object

    # Create an empty at look_at position as the tracking target
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=look_at)
    target_empty = bpy.context.active_object
    target_empty.name = "CameraTarget"

    constraint.target = target_empty
    constraint.track_axis = 'TRACK_NEGATIVE_Z'
    constraint.up_axis = 'UP_Y'

    # Set as active camera
    bpy.context.scene.camera = cam_obj

    return cam_obj


# ============================================================
# HELPER: SETUP 3-POINT LIGHTING
# ============================================================

def setup_lighting():
    """
    Create a 3-point lighting rig.
      Key light  : white,          strength 8,   position (5, -5, 7)
      Fill light : dim white 0.5,  strength 0.5, position (-5, -3, 4)
      Rim light  : #C0392B red,    strength 3,   position (0, 6, 3)
    Removes any existing light objects before creating new ones.
    """
    # Remove existing lights
    for obj in list(bpy.data.objects):
        if obj.type == 'LIGHT':
            bpy.data.objects.remove(obj, do_unlink=True)

    def add_light(name, light_type, location, color, strength):
        bpy.ops.object.light_add(type=light_type, location=location)
        light_obj = bpy.context.active_object
        light_obj.name = name
        light_obj.data.color = color[:3]
        light_obj.data.energy = strength
        if light_type == 'AREA':
            light_obj.data.size = 3.0
        return light_obj

    # Key light — white, strong
    add_light(
        name='KeyLight',
        light_type='POINT',
        location=(5.0, -5.0, 7.0),
        color=(1.0, 1.0, 1.0),
        strength=800.0   # Point lights use watts; 800W ≈ visually ~strength 8 in Cycles
    )

    # Fill light — dim white
    add_light(
        name='FillLight',
        light_type='POINT',
        location=(-5.0, -3.0, 4.0),
        color=(1.0, 1.0, 1.0),
        strength=100.0   # ~0.5 relative strength
    )

    # Rim / back light — brand red #C0392B
    rim_r, rim_g, rim_b, _ = hex_to_rgb('#C0392B')
    add_light(
        name='RimLight',
        light_type='POINT',
        location=(0.0, 6.0, 3.0),
        color=(rim_r, rim_g, rim_b),
        strength=350.0   # ~strength 3 relative
    )


# ============================================================
# HELPER: RENDER SCENE
# ============================================================

def render_scene(output_path):
    """Configure render settings and render the active scene to output_path."""
    scene = bpy.context.scene

    # Engine: prefer Cycles, fall back to EEVEE
    try:
        scene.render.engine = 'CYCLES'
        if bpy.context.preferences.addons.get('cycles') is None:
            raise RuntimeError("Cycles not available")
        # Cycles quality settings — keep sample count reasonable for speed
        scene.cycles.samples = 128
        scene.cycles.use_denoising = True
    except Exception:
        scene.render.engine = 'BLENDER_EEVEE'

    # Resolution
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100

    # Black background
    scene.world.use_nodes = True
    bg_node = scene.world.node_tree.nodes.get('Background')
    if bg_node:
        bg_node.inputs['Color'].default_value = (0.0, 0.0, 0.0, 1.0)
        bg_node.inputs['Strength'].default_value = 0.0

    # Output format
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = output_path

    bpy.ops.render.render(write_still=True)
    print(f"[blender_renders.py] Rendered: {output_path}")


# ============================================================
# HELPER: DELETE TAGGED OBJECTS
# ============================================================

def delete_tagged_objects(tag):
    """Delete all objects whose name starts with 'tag'."""
    for obj in list(bpy.data.objects):
        if obj.name.startswith(tag):
            bpy.data.objects.remove(obj, do_unlink=True)

    # Also remove orphaned meshes / curves left over
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for curve in list(bpy.data.curves):
        if curve.users == 0:
            bpy.data.curves.remove(curve)


# ============================================================
# STEP 1 — CLEAR DEFAULT SCENE
# ============================================================

def clear_scene():
    """Remove all default objects (cube, lamp, camera) and orphan data."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Purge orphan data blocks
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for light in list(bpy.data.lights):
        if light.users == 0:
            bpy.data.lights.remove(light)
    for cam in list(bpy.data.cameras):
        if cam.users == 0:
            bpy.data.cameras.remove(cam)
    for curve in list(bpy.data.curves):
        if curve.users == 0:
            bpy.data.curves.remove(curve)

    # Ensure a world exists
    if not bpy.data.worlds:
        bpy.ops.world.new()
    bpy.context.scene.world = bpy.data.worlds[0]
    bpy.context.scene.world.use_nodes = True

    print("[blender_renders.py] Scene cleared.")


# ============================================================
# STEP 2 — CREATE SHARED MATERIALS
# ============================================================

def create_materials():
    """Create and return the three shared brand materials."""
    mat_dark = create_material(
        name='mat_dark',
        color_hex='#1A1A1A',
        metallic=0.8,
        roughness=0.2
    )
    mat_red_accent = create_material(
        name='mat_red_accent',
        color_hex='#C0392B',
        emission=True,
        emission_strength=2.0
    )
    mat_chip = create_material(
        name='mat_chip',
        color_hex='#2A2A2A',
        metallic=0.9,
        roughness=0.1
    )
    return mat_dark, mat_red_accent, mat_chip


# ============================================================
# RENDER 1 — NNT BAG HERO
# ============================================================

def build_and_render_bag(mat_dark, mat_red_accent, mat_chip, output_path):
    """
    Build a stylised bag shape, render it, then clean up.
    All objects are prefixed 'BAG_' for easy deletion.
    """
    print("[blender_renders.py] Building bag scene...")

    # ----------------------------------------------------------
    # BAG BODY — large flat box (3.0 x 1.8 x 0.3)
    # ----------------------------------------------------------
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.0))
    bag_body = bpy.context.active_object
    bag_body.name = 'BAG_body'
    bag_body.scale = (3.0, 0.3, 1.8)   # width x depth x height (stored as half-extents × 2 in scale)
    # Note: Blender cube primitive is 2×2×2 by default; scale by half desired dim
    # Correct: scale = (half_width, half_depth, half_height)
    bag_body.scale = (1.5, 0.15, 0.9)
    bpy.ops.object.transform_apply(scale=True)
    assign_material(bag_body, mat_dark)

    # ----------------------------------------------------------
    # HANDLES — two thin cylinders at top
    # radius 0.04, height 1.2, offset left and right
    # ----------------------------------------------------------
    handle_x_offset = 0.55
    handle_z_base = 0.9   # sits on top of bag body

    for side, x_pos in [('L', -handle_x_offset), ('R', handle_x_offset)]:
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.04,
            depth=1.2,
            location=(x_pos, 0.0, handle_z_base + 0.6)
        )
        handle = bpy.context.active_object
        handle.name = f'BAG_handle_{side}'
        # Rotate handle to arch slightly outward (5 degrees)
        handle.rotation_euler[2] = math.radians(5) if side == 'R' else math.radians(-5)
        assign_material(handle, mat_dark)

    # ----------------------------------------------------------
    # RED ACCENT STRIPE — thin flat strip on front face
    # Width = full bag width (3.0), Height = 0.1, thin depth
    # ----------------------------------------------------------
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, -0.17, 0.0))
    accent_stripe = bpy.context.active_object
    accent_stripe.name = 'BAG_accent_stripe'
    accent_stripe.scale = (1.5, 0.02, 0.05)   # full width, very thin, narrow strip
    bpy.ops.object.transform_apply(scale=True)
    assign_material(accent_stripe, mat_red_accent)

    # ----------------------------------------------------------
    # SIDE SEAM DETAILS — thin box seams on left and right edges
    # ----------------------------------------------------------
    for side, x_pos in [('L', -1.48), ('R', 1.48)]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x_pos, 0.0, 0.0))
        seam = bpy.context.active_object
        seam.name = f'BAG_seam_{side}'
        seam.scale = (0.02, 0.16, 0.9)
        bpy.ops.object.transform_apply(scale=True)
        assign_material(seam, mat_chip)

    # ----------------------------------------------------------
    # TILT BAG 15 DEGREES on Z axis for dynamic angle
    # ----------------------------------------------------------
    for obj in bpy.data.objects:
        if obj.name.startswith('BAG_'):
            obj.rotation_euler[2] = math.radians(15)

    # ----------------------------------------------------------
    # CAMERA for bag scene
    # ----------------------------------------------------------
    cam = setup_camera(
        location=(3.5, -3.5, 2.5),
        look_at=(0.0, 0.0, 0.3),
        focal_length=50
    )

    # ----------------------------------------------------------
    # LIGHTING
    # ----------------------------------------------------------
    setup_lighting()

    # ----------------------------------------------------------
    # RENDER
    # ----------------------------------------------------------
    render_scene(output_path)

    # ----------------------------------------------------------
    # CLEANUP
    # ----------------------------------------------------------
    delete_tagged_objects('BAG_')
    # Remove camera and lights too
    for obj in list(bpy.data.objects):
        if obj.type in ('CAMERA', 'LIGHT', 'EMPTY'):
            bpy.data.objects.remove(obj, do_unlink=True)

    print("[blender_renders.py] Bag scene cleaned up.")


# ============================================================
# RENDER 2 — WARRIOR RAM STICK
# ============================================================

def build_and_render_ram(mat_dark, mat_red_accent, mat_chip, output_path):
    """
    Build a stylised RAM stick, render it, then clean up.
    All objects prefixed 'RAM_'.
    """
    print("[blender_renders.py] Building RAM scene...")

    # Materials for this scene
    mat_gold = create_material(
        name='mat_gold_contacts',
        color_hex='#B8860B',
        metallic=1.0,
        roughness=0.1
    )
    mat_white = create_white_material('mat_white')

    # ----------------------------------------------------------
    # MAIN STICK BODY — long flat rectangle (4.0 x 0.05 x 1.0)
    # ----------------------------------------------------------
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.5))
    ram_body = bpy.context.active_object
    ram_body.name = 'RAM_body'
    ram_body.scale = (2.0, 0.025, 0.5)    # half extents → 4.0 × 0.05 × 1.0
    bpy.ops.object.transform_apply(scale=True)
    assign_material(ram_body, mat_dark)

    # ----------------------------------------------------------
    # PCB CONTACTS — bottom thin gold strip (4.0 x 0.05 x 0.15)
    # ----------------------------------------------------------
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.075))
    contacts = bpy.context.active_object
    contacts.name = 'RAM_contacts'
    contacts.scale = (2.0, 0.025, 0.075)   # half extents → 4.0 × 0.05 × 0.15
    bpy.ops.object.transform_apply(scale=True)
    assign_material(contacts, mat_gold)

    # ----------------------------------------------------------
    # MEMORY CHIPS — 8 small boxes evenly spaced on top face
    # Each chip: 0.35 x 0.08 x 0.35
    # Spaced along X axis, sitting on top of the body (z = 1.0 + 0.35/2 = 1.175)
    # ----------------------------------------------------------
    chip_z = 1.0 + 0.175     # top of body (1.0) + half chip height (0.35/2)
    chip_spacing = 4.0 / 9   # 8 chips across 4.0 width → ~0.444 spacing
    chip_x_start = -4.0 / 2 + chip_spacing

    for i in range(8):
        chip_x = chip_x_start + i * chip_spacing
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(chip_x, 0.0, chip_z))
        chip = bpy.context.active_object
        chip.name = f'RAM_chip_{i:02d}'
        chip.scale = (0.175, 0.04, 0.175)   # half extents → 0.35 × 0.08 × 0.35
        bpy.ops.object.transform_apply(scale=True)
        assign_material(chip, mat_chip)

    # ----------------------------------------------------------
    # RED HEATSPREADER FIN — thin tall strip running full length at top
    # (4.0 x 0.05 x 0.25), positioned at very top of body
    # ----------------------------------------------------------
    heatspreader_z = 1.0 + 0.35 + 0.125  # above chips + half fin height
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, heatspreader_z))
    fin = bpy.context.active_object
    fin.name = 'RAM_heatspreader_fin'
    fin.scale = (2.0, 0.025, 0.125)   # half extents → 4.0 × 0.05 × 0.25
    bpy.ops.object.transform_apply(scale=True)
    assign_material(fin, mat_red_accent)

    # ----------------------------------------------------------
    # "WARRIOR" TEXT on front face
    # ----------------------------------------------------------
    try:
        bpy.ops.object.text_add(location=(-0.8, -0.04, 0.55))
        text_obj = bpy.context.active_object
        text_obj.name = 'RAM_text_warrior'
        text_obj.data.body = "WARRIOR"
        text_obj.data.extrude = 0.015
        text_obj.data.size = 0.18
        text_obj.data.align_x = 'LEFT'
        # Rotate to face forward (text default is XY plane, we need XZ)
        text_obj.rotation_euler = (math.radians(90), 0.0, 0.0)
        assign_material(text_obj, mat_white)
    except Exception as e:
        print(f"[blender_renders.py] Text creation skipped: {e}")

    # ----------------------------------------------------------
    # CAMERA for RAM
    # ----------------------------------------------------------
    setup_camera(
        location=(2.5, -2.0, 1.5),
        look_at=(0.0, 0.0, 0.7),
        focal_length=50
    )

    # ----------------------------------------------------------
    # LIGHTING
    # ----------------------------------------------------------
    setup_lighting()

    # ----------------------------------------------------------
    # RENDER
    # ----------------------------------------------------------
    render_scene(output_path)

    # ----------------------------------------------------------
    # CLEANUP
    # ----------------------------------------------------------
    delete_tagged_objects('RAM_')
    for obj in list(bpy.data.objects):
        if obj.type in ('CAMERA', 'LIGHT', 'EMPTY'):
            bpy.data.objects.remove(obj, do_unlink=True)
    # Clean up temporary materials
    for name in ('mat_gold_contacts', 'mat_white'):
        if name in bpy.data.materials:
            bpy.data.materials.remove(bpy.data.materials[name], do_unlink=True)

    print("[blender_renders.py] RAM scene cleaned up.")


# ============================================================
# RENDER 3 — WARRIOR SSD
# ============================================================

def build_and_render_ssd(mat_dark, mat_red_accent, mat_chip, output_path):
    """
    Build a stylised SSD slab, render it, then clean up.
    All objects prefixed 'SSD_'.
    """
    print("[blender_renders.py] Building SSD scene...")

    # Temporary gold material for connector
    mat_gold = create_material(
        name='mat_gold_connector',
        color_hex='#B8860B',
        metallic=1.0,
        roughness=0.1
    )

    # ----------------------------------------------------------
    # MAIN BODY — flat rectangular slab (3.5 x 0.3 x 2.0)
    # Oriented so width=3.5, depth=0.3, height=2.0
    # ----------------------------------------------------------
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.0))
    ssd_body = bpy.context.active_object
    ssd_body.name = 'SSD_body'
    ssd_body.scale = (1.75, 0.15, 1.0)    # half extents → 3.5 × 0.3 × 2.0
    bpy.ops.object.transform_apply(scale=True)
    assign_material(ssd_body, mat_dark)

    # ----------------------------------------------------------
    # CONNECTOR EDGE — thin gold strip at one end (right edge, x=1.75)
    # Dimensions: 0.4 x 0.28 x 2.0
    # ----------------------------------------------------------
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(1.75 + 0.2, 0.0, 0.0))
    connector = bpy.context.active_object
    connector.name = 'SSD_connector'
    connector.scale = (0.2, 0.14, 1.0)    # half extents → 0.4 × 0.28 × 2.0
    bpy.ops.object.transform_apply(scale=True)
    assign_material(connector, mat_gold)

    # ----------------------------------------------------------
    # CONTROLLER CHIP — medium box centred on top face
    # 0.8 x 0.1 x 0.8, positioned on top of body (z = 1.0 + 0.1/2)
    # ----------------------------------------------------------
    ctrl_z = 1.0 + 0.05
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, ctrl_z))
    ctrl_chip = bpy.context.active_object
    ctrl_chip.name = 'SSD_controller_chip'
    ctrl_chip.scale = (0.4, 0.05, 0.4)    # half extents → 0.8 × 0.1 × 0.8
    bpy.ops.object.transform_apply(scale=True)
    assign_material(ctrl_chip, mat_chip)

    # ----------------------------------------------------------
    # FLASH CHIPS — 4 smaller boxes arranged on top face
    # Each: 0.4 x 0.08 x 0.4, arranged in 2×2 grid offset from centre
    # ----------------------------------------------------------
    flash_z = 1.0 + 0.04   # sits on top of ssd body
    flash_positions = [
        (-0.65,  0.0, flash_z),
        ( 0.65,  0.0, flash_z),
        (-0.65,  0.0, flash_z),   # we spread them out further
        ( 0.65,  0.0, flash_z),
    ]
    # Better: spread them along X
    flash_x_positions = [-1.2, -0.55, 0.55, 1.2]
    for i, fx in enumerate(flash_x_positions):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(fx, 0.0, flash_z))
        fchip = bpy.context.active_object
        fchip.name = f'SSD_flash_chip_{i:02d}'
        fchip.scale = (0.2, 0.04, 0.2)    # half extents → 0.4 × 0.08 × 0.4
        bpy.ops.object.transform_apply(scale=True)
        assign_material(fchip, mat_chip)

    # ----------------------------------------------------------
    # RED ACCENT STRIPE — running length of top edge
    # (3.5 x 0.08 x 0.05), at top edge z = 1.0, along front edge
    # ----------------------------------------------------------
    stripe_z = 1.0 + 0.025   # just above top face
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, -0.14, stripe_z))
    stripe = bpy.context.active_object
    stripe.name = 'SSD_accent_stripe'
    stripe.scale = (1.75, 0.04, 0.025)    # half extents → 3.5 × 0.08 × 0.05
    bpy.ops.object.transform_apply(scale=True)
    assign_material(stripe, mat_red_accent)

    # ----------------------------------------------------------
    # CAMERA for SSD
    # ----------------------------------------------------------
    setup_camera(
        location=(2.5, -2.5, 2.0),
        look_at=(0.0, 0.0, 0.0),
        focal_length=50
    )

    # ----------------------------------------------------------
    # LIGHTING
    # ----------------------------------------------------------
    setup_lighting()

    # ----------------------------------------------------------
    # RENDER
    # ----------------------------------------------------------
    render_scene(output_path)

    # ----------------------------------------------------------
    # CLEANUP (optional — last scene, but good practice)
    # ----------------------------------------------------------
    delete_tagged_objects('SSD_')
    for obj in list(bpy.data.objects):
        if obj.type in ('CAMERA', 'LIGHT', 'EMPTY'):
            bpy.data.objects.remove(obj, do_unlink=True)
    if 'mat_gold_connector' in bpy.data.materials:
        bpy.data.materials.remove(bpy.data.materials['mat_gold_connector'], do_unlink=True)

    print("[blender_renders.py] SSD scene cleaned up.")


# ============================================================
# MAIN ENTRY POINT
# ============================================================

def main():
    print("=" * 60)
    print("[blender_renders.py] Starting Umbrella Corp HQ renders")
    print(f"[blender_renders.py] Output directory: {RENDER_DIR}")
    print("=" * 60)

    # 1. Clear the default scene
    clear_scene()

    # 2. Create shared brand materials
    mat_dark, mat_red_accent, mat_chip = create_materials()

    # ----------------------------------------------------------
    # SCENE 1: NNT Bag Hero
    # ----------------------------------------------------------
    print("\n[blender_renders.py] --- SCENE 1: NNT Bag Hero ---")
    bag_output = os.path.join(RENDER_DIR, "NNT_bag_hero.png")
    build_and_render_bag(mat_dark, mat_red_accent, mat_chip, bag_output)

    # Recreate materials (they survive scene but let's be safe)
    mat_dark, mat_red_accent, mat_chip = create_materials()

    # ----------------------------------------------------------
    # SCENE 2: Warrior RAM
    # ----------------------------------------------------------
    print("\n[blender_renders.py] --- SCENE 2: Warrior RAM ---")
    ram_output = os.path.join(RENDER_DIR, "Warrior_RAM.png")
    build_and_render_ram(mat_dark, mat_red_accent, mat_chip, ram_output)

    # Recreate materials again
    mat_dark, mat_red_accent, mat_chip = create_materials()

    # ----------------------------------------------------------
    # SCENE 3: Warrior SSD
    # ----------------------------------------------------------
    print("\n[blender_renders.py] --- SCENE 3: Warrior SSD ---")
    ssd_output = os.path.join(RENDER_DIR, "Warrior_SSD.png")
    build_and_render_ssd(mat_dark, mat_red_accent, mat_chip, ssd_output)

    print("\n" + "=" * 60)
    print("[blender_renders.py] All renders complete.")
    print(f"  NNT_bag_hero.png  → {bag_output}")
    print(f"  Warrior_RAM.png   → {ram_output}")
    print(f"  Warrior_SSD.png   → {ssd_output}")
    print("=" * 60)


# Run
main()
