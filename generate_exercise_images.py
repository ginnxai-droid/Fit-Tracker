"""
Exercise Illustration Generator
Generates 15 professional, app-ready exercise illustration images.
Style: Dark background, vibrant cyan/green glow, minimalist stick figures.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import os

# --- Configuration ---
SIZE = 512
BG_COLOR = (26, 26, 46)        # #1a1a2e
ACCENT_CYAN = (0, 229, 255)    # Bright cyan
ACCENT_GREEN = (0, 255, 136)   # Vibrant green
ACCENT_TEAL = (0, 200, 200)    # Teal
GLOW_CYAN = (0, 180, 220, 60)  # Semi-transparent glow
BODY_COLOR = (0, 229, 255)     # Main figure color
JOINT_COLOR = (0, 255, 200)    # Joint dots
GROUND_COLOR = (40, 40, 70)    # Ground line
TEXT_COLOR = (200, 220, 255)    # Label text
ARROW_COLOR = (0, 255, 136)    # Motion arrows
LINE_WIDTH = 7
JOINT_RADIUS = 7
HEAD_RADIUS = 22
OUTPUT_DIR = r"d:\Antigravity Project\Fit tracker\exercise-images"

os.makedirs(OUTPUT_DIR, exist_ok=True)


def create_base_image():
    """Create a dark background image with subtle grid."""
    img = Image.new('RGBA', (SIZE, SIZE), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img)
    
    # Subtle grid dots
    for x in range(0, SIZE, 32):
        for y in range(0, SIZE, 32):
            draw.ellipse([x-1, y-1, x+1, y+1], fill=(40, 40, 65, 100))
    
    return img, draw


def draw_glow_line(img, draw, p1, p2, color=BODY_COLOR, width=LINE_WIDTH):
    """Draw a line with a soft glow effect."""
    # Glow layers
    glow_img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    
    for i in range(3, 0, -1):
        alpha = 20 + (3 - i) * 15
        glow_color = (color[0], color[1], color[2], alpha)
        glow_draw.line([p1, p2], fill=glow_color, width=width + i * 6, joint="curve")
    
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=4))
    img.paste(Image.alpha_composite(Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0)), glow_img), (0, 0), glow_img)
    
    # Main line
    draw.line([p1, p2], fill=color, width=width, joint="curve")


def draw_glow_circle(img, draw, center, radius, color=BODY_COLOR):
    """Draw a circle with glow effect."""
    cx, cy = center
    # Glow
    glow_img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    for i in range(4, 0, -1):
        alpha = 15 + (4 - i) * 10
        r = radius + i * 4
        glow_draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(color[0], color[1], color[2], alpha))
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=5))
    img.paste(Image.alpha_composite(Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0)), glow_img), (0, 0), glow_img)
    
    # Main circle
    draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], fill=color, outline=color)


def draw_joint(img, draw, pos, radius=JOINT_RADIUS):
    """Draw a joint dot."""
    x, y = pos
    draw.ellipse([x-radius, y-radius, x+radius, y+radius], fill=JOINT_COLOR)


def draw_ground(draw, y, x_start=60, x_end=452):
    """Draw a ground line."""
    draw.line([(x_start, y), (x_end, y)], fill=GROUND_COLOR, width=3)
    # Small ticks
    for x in range(x_start, x_end, 30):
        draw.line([(x, y), (x - 8, y + 8)], fill=(35, 35, 60), width=2)


def draw_arrow(draw, start, end, color=ARROW_COLOR, width=3):
    """Draw a motion arrow."""
    draw.line([start, end], fill=color, width=width)
    # Arrowhead
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = math.sqrt(dx*dx + dy*dy)
    if length == 0:
        return
    dx, dy = dx/length, dy/length
    # Perpendicular
    px, py = -dy, dx
    arrow_size = 12
    tip = end
    left = (tip[0] - arrow_size*dx + arrow_size*0.4*px, tip[1] - arrow_size*dy + arrow_size*0.4*py)
    right = (tip[0] - arrow_size*dx - arrow_size*0.4*px, tip[1] - arrow_size*dy - arrow_size*0.4*py)
    draw.polygon([tip, left, right], fill=color)


def draw_curved_arrow(draw, center, radius, start_angle, end_angle, color=ARROW_COLOR, steps=30):
    """Draw a curved motion arrow."""
    points = []
    for i in range(steps + 1):
        angle = math.radians(start_angle + (end_angle - start_angle) * i / steps)
        x = center[0] + radius * math.cos(angle)
        y = center[1] + radius * math.sin(angle)
        points.append((x, y))
    
    for i in range(len(points) - 1):
        draw.line([points[i], points[i+1]], fill=color, width=3)
    
    if len(points) >= 2:
        draw_arrow(draw, points[-2], points[-1], color, width=3)


def draw_body(img, draw, joints, color=BODY_COLOR):
    """Draw a stick figure body from joint positions.
    
    joints dict keys:
        head, neck, l_shoulder, r_shoulder, l_elbow, r_elbow,
        l_hand, r_hand, hip (or l_hip, r_hip), l_knee, r_knee,
        l_foot, r_foot
    """
    connections = [
        ('neck', 'l_shoulder'), ('neck', 'r_shoulder'),
        ('l_shoulder', 'l_elbow'), ('l_elbow', 'l_hand'),
        ('r_shoulder', 'r_elbow'), ('r_elbow', 'r_hand'),
    ]
    
    # Torso - use hip or midpoint of l_hip/r_hip
    if 'hip' in joints:
        connections.append(('neck', 'hip'))
        hip_center = joints['hip']
    else:
        # Draw pelvis
        draw_glow_line(img, draw, joints['l_hip'], joints['r_hip'], color, LINE_WIDTH)
        hip_center = ((joints['l_hip'][0] + joints['r_hip'][0]) // 2,
                       (joints['l_hip'][1] + joints['r_hip'][1]) // 2)
        connections.append(('neck', 'l_hip'))
        connections.append(('neck', 'r_hip'))
    
    # Legs
    if 'l_hip' in joints and 'r_hip' in joints:
        leg_connections = [
            ('l_hip', 'l_knee'), ('l_knee', 'l_foot'),
            ('r_hip', 'r_knee'), ('r_knee', 'r_foot'),
        ]
    else:
        leg_connections = [
            ('hip', 'l_knee'), ('l_knee', 'l_foot'),
            ('hip', 'r_knee'), ('r_knee', 'r_foot'),
        ]
    
    all_connections = connections + leg_connections
    
    for j1, j2 in all_connections:
        if j1 in joints and j2 in joints:
            draw_glow_line(img, draw, joints[j1], joints[j2], color, LINE_WIDTH)
    
    # Head
    if 'head' in joints:
        draw_glow_circle(img, draw, joints['head'], HEAD_RADIUS, color)
    
    # Joints
    for key, pos in joints.items():
        if key != 'head':
            draw_joint(img, draw, pos, 5)


def add_title(draw, text, y=470):
    """Add exercise title text at bottom."""
    # Use default font at a reasonable size
    try:
        font = ImageFont.truetype("arial.ttf", 22)
    except:
        font = ImageFont.load_default()
    
    # Text with shadow
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    tx = (SIZE - tw) // 2
    
    # Shadow
    draw.text((tx + 1, y + 1), text, fill=(10, 10, 30), font=font)
    # Main text
    draw.text((tx, y), text, fill=TEXT_COLOR, font=font)


def add_subtitle(draw, text, y=445):
    """Add smaller subtitle."""
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except:
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    tx = (SIZE - tw) // 2
    draw.text((tx, y), text, fill=(120, 140, 170), font=font)


def save_image(img, filename):
    """Save as PNG, converting to RGB."""
    path = os.path.join(OUTPUT_DIR, filename)
    final = Image.new('RGB', (SIZE, SIZE), BG_COLOR)
    final.paste(img, (0, 0), img)
    final.save(path, 'PNG', quality=95)
    print(f"  Saved: {path}")


# ============================================================
# Exercise illustration generators
# ============================================================

def gen_squat():
    """Bodyweight Squat - side view, in squat position."""
    img, draw = create_base_image()
    draw_ground(draw, 410)
    
    joints = {
        'head': (256, 160),
        'neck': (256, 195),
        'l_shoulder': (230, 195), 'r_shoulder': (282, 195),
        'l_elbow': (215, 230), 'r_elbow': (297, 230),
        'l_hand': (225, 265), 'r_hand': (287, 265),
        'l_hip': (240, 290), 'r_hip': (272, 290),
        'l_knee': (210, 350), 'r_knee': (302, 350),
        'l_foot': (200, 408), 'r_foot': (312, 408),
    }
    
    draw_body(img, draw, joints)
    
    # Arrows showing squat motion
    draw_arrow(draw, (170, 160), (170, 210), ARROW_COLOR)
    draw_arrow(draw, (170, 280), (170, 230), ARROW_COLOR)
    
    # Back alignment line (dotted effect)
    for y in range(160, 295, 8):
        draw.line([(256, y), (256, y+4)], fill=(0, 255, 136, 80), width=1)
    
    add_subtitle(draw, "Keep back straight, knees over toes")
    add_title(draw, "BODYWEIGHT SQUAT")
    save_image(img, "squat.png")


def gen_pushup():
    """Push-up - side view, arms extended."""
    img, draw = create_base_image()
    draw_ground(draw, 380)
    
    joints = {
        'head': (130, 215),
        'neck': (160, 230),
        'l_shoulder': (175, 230), 'r_shoulder': (175, 230),
        'l_elbow': (175, 290), 'r_elbow': (175, 290),
        'l_hand': (175, 375), 'r_hand': (175, 375),
        'hip': (310, 250),
        'l_knee': (370, 310), 'r_knee': (370, 310),
        'l_foot': (415, 375), 'r_foot': (415, 375),
    }
    
    draw_body(img, draw, joints)
    
    # Core alignment line
    for x in range(145, 420, 10):
        frac = (x - 145) / (420 - 145)
        y = int(225 + frac * 155)
        draw.ellipse([x-1, y-1, x+1, y+1], fill=(0, 255, 136, 60))
    
    # Arrow showing push direction
    draw_arrow(draw, (175, 340), (175, 305), ARROW_COLOR)
    
    add_subtitle(draw, "Arms extended, core engaged")
    add_title(draw, "PUSH-UP")
    save_image(img, "pushup.png")


def gen_crunch():
    """Crunch - side view, person doing a crunch on floor."""
    img, draw = create_base_image()
    draw_ground(draw, 380)
    
    # Person lying with upper body slightly raised
    joints = {
        'head': (200, 240),
        'neck': (225, 270),
        'l_shoulder': (235, 275), 'r_shoulder': (235, 275),
        'l_elbow': (210, 255), 'r_elbow': (210, 255),
        'l_hand': (200, 240), 'r_hand': (200, 240),  # Hands behind head
        'hip': (300, 350),
        'l_knee': (370, 280), 'r_knee': (370, 280),
        'l_foot': (410, 375), 'r_foot': (410, 375),
    }
    
    draw_body(img, draw, joints)
    
    # Motion arrow showing crunch
    draw_curved_arrow(draw, (256, 300), 80, -120, -60, ARROW_COLOR)
    
    add_subtitle(draw, "Hands behind head, engage core")
    add_title(draw, "CRUNCH")
    save_image(img, "crunch.png")


def gen_plank():
    """Plank hold - side view, forearm plank."""
    img, draw = create_base_image()
    draw_ground(draw, 370)
    
    joints = {
        'head': (120, 225),
        'neck': (150, 240),
        'l_shoulder': (165, 245), 'r_shoulder': (165, 245),
        'l_elbow': (165, 310), 'r_elbow': (165, 310),
        'l_hand': (120, 365), 'r_hand': (120, 365),
        'hip': (305, 260),
        'l_knee': (375, 310), 'r_knee': (375, 310),
        'l_foot': (420, 365), 'r_foot': (420, 365),
    }
    
    draw_body(img, draw, joints)
    
    # Straight body line indicator
    for i in range(0, 30):
        x = 145 + i * 9
        frac = i / 29
        y = int(237 + frac * 130)
        alpha = 80
        draw.ellipse([x-2, y-2, x+2, y+2], fill=(0, 255, 136, alpha))
    
    add_subtitle(draw, "Body in straight line, forearms down")
    add_title(draw, "PLANK HOLD")
    save_image(img, "plank.png")


def gen_leg_raise():
    """Lying leg raises - side view, legs raised upward."""
    img, draw = create_base_image()
    draw_ground(draw, 380)
    
    # Person lying flat, legs raised to ~60 degrees
    joints = {
        'head': (120, 345),
        'neck': (155, 350),
        'l_shoulder': (165, 352), 'r_shoulder': (165, 352),
        'l_elbow': (145, 370), 'r_elbow': (145, 370),
        'l_hand': (125, 375), 'r_hand': (125, 375),
        'hip': (280, 360),
        'l_knee': (340, 250), 'r_knee': (340, 250),
        'l_foot': (380, 170), 'r_foot': (380, 170),
    }
    
    draw_body(img, draw, joints)
    
    # Arrow showing leg raise direction
    draw_arrow(draw, (395, 300), (395, 210), ARROW_COLOR)
    draw_arrow(draw, (395, 200), (395, 290), (0, 200, 200))
    
    add_subtitle(draw, "Keep legs straight, raise upward")
    add_title(draw, "LYING LEG RAISE")
    save_image(img, "leg_raise.png")


def gen_mountain_climber():
    """Mountain climbers - plank position, knee driving forward."""
    img, draw = create_base_image()
    draw_ground(draw, 380)
    
    joints = {
        'head': (135, 200),
        'neck': (160, 220),
        'l_shoulder': (175, 225), 'r_shoulder': (175, 225),
        'l_elbow': (175, 295), 'r_elbow': (175, 295),
        'l_hand': (175, 375), 'r_hand': (175, 375),
        'l_hip': (310, 250), 'r_hip': (310, 250),
        'l_knee': (240, 295), 'r_knee': (380, 310),
        'l_foot': (210, 350), 'r_foot': (425, 375),
    }
    
    draw_body(img, draw, joints)
    
    # Arrow showing knee drive
    draw_arrow(draw, (280, 295), (230, 280), ARROW_COLOR)
    
    add_subtitle(draw, "Drive knee to chest, maintain plank")
    add_title(draw, "MOUNTAIN CLIMBER")
    save_image(img, "mountain_climber.png")


def gen_tai_chi():
    """Tai Chi flow - person in flowing stance."""
    img, draw = create_base_image()
    draw_ground(draw, 420)
    
    joints = {
        'head': (260, 120),
        'neck': (260, 155),
        'l_shoulder': (235, 160), 'r_shoulder': (285, 160),
        'l_elbow': (195, 185), 'r_elbow': (330, 200),
        'l_hand': (160, 210), 'r_hand': (365, 170),
        'l_hip': (245, 270), 'r_hip': (275, 270),
        'l_knee': (220, 340), 'r_knee': (310, 340),
        'l_foot': (195, 415), 'r_foot': (340, 415),
    }
    
    draw_body(img, draw, joints)
    
    # Flowing energy circles
    for i in range(0, 20):
        angle = math.radians(i * 18)
        r = 30 + i * 2
        x = 160 + int(r * 0.3 * math.cos(angle))
        y = 210 + int(r * 0.3 * math.sin(angle))
        alpha = max(20, 80 - i * 3)
        draw.ellipse([x-2, y-2, x+2, y+2], fill=(0, 255, 200, alpha))
    
    # Curved motion lines around hands
    draw_curved_arrow(draw, (365, 170), 30, 30, 150, (0, 200, 180, 120))
    
    add_subtitle(draw, "Flowing movement, peaceful stance")
    add_title(draw, "TAI CHI FLOW")
    save_image(img, "tai_chi.png")


def gen_glute_bridge():
    """Glute bridge - lying, hips raised."""
    img, draw = create_base_image()
    draw_ground(draw, 385)
    
    joints = {
        'head': (110, 370),
        'neck': (145, 360),
        'l_shoulder': (160, 358), 'r_shoulder': (160, 358),
        'l_elbow': (150, 375), 'r_elbow': (150, 375),
        'l_hand': (140, 382), 'r_hand': (140, 382),
        'hip': (270, 270),
        'l_knee': (350, 310), 'r_knee': (350, 310),
        'l_foot': (390, 380), 'r_foot': (390, 380),
    }
    
    draw_body(img, draw, joints)
    
    # Arrow showing hip raise
    draw_arrow(draw, (270, 310), (270, 260), ARROW_COLOR)
    
    add_subtitle(draw, "Knees bent, drive hips upward")
    add_title(draw, "GLUTE BRIDGE")
    save_image(img, "glute_bridge.png")


def gen_bird_dog():
    """Bird-dog - all fours, opposite arm and leg extended."""
    img, draw = create_base_image()
    draw_ground(draw, 390)
    
    joints = {
        'head': (165, 210),
        'neck': (195, 230),
        'l_shoulder': (205, 235), 'r_shoulder': (205, 235),
        'l_elbow': (145, 210), 'r_elbow': (205, 310),
        'l_hand': (95, 185), 'r_hand': (205, 385),   # Left arm extended forward
        'hip': (320, 250),
        'l_knee': (320, 330), 'r_knee': (380, 240),
        'l_foot': (320, 385), 'r_foot': (430, 200),   # Right leg extended back
    }
    
    draw_body(img, draw, joints)
    
    # Extension arrows
    draw_arrow(draw, (120, 195), (85, 180), ARROW_COLOR)
    draw_arrow(draw, (410, 215), (445, 195), ARROW_COLOR)
    
    # Balance line
    for i in range(0, 25):
        x = 95 + i * 14
        frac = i / 24
        y = int(185 + frac * 15)
        draw.ellipse([x-1, y-1, x+1, y+1], fill=(0, 255, 136, 50))
    
    add_subtitle(draw, "Extend opposite arm and leg")
    add_title(draw, "BIRD-DOG")
    save_image(img, "bird_dog.png")


def gen_cat_cow():
    """Cat-cow stretch - on all fours, spine arched (cat position)."""
    img, draw = create_base_image()
    draw_ground(draw, 395)
    
    # Cat position - spine arched upward
    joints = {
        'head': (160, 290),
        'neck': (185, 260),
        'l_shoulder': (195, 250), 'r_shoulder': (195, 250),
        'l_elbow': (190, 320), 'r_elbow': (190, 320),
        'l_hand': (185, 390), 'r_hand': (185, 390),
        'hip': (340, 265),
        'l_knee': (355, 335), 'r_knee': (355, 335),
        'l_foot': (370, 390), 'r_foot': (370, 390),
    }
    
    draw_body(img, draw, joints)
    
    # Spine arch visualization (curved line above the back)
    for i in range(0, 25):
        frac = i / 24
        x = 195 + int(frac * 145)
        # Parabola arch
        arch = -50 * math.sin(frac * math.pi)
        y = int(255 + arch)
        draw.ellipse([x-2, y-2, x+2, y+2], fill=(0, 255, 136, 70))
    
    # Arrow showing spine arch direction
    draw_arrow(draw, (265, 250), (265, 210), ARROW_COLOR)
    
    add_subtitle(draw, "Arch spine upward, tuck chin")
    add_title(draw, "CAT-COW STRETCH")
    save_image(img, "cat_cow.png")


def gen_hip_circle():
    """Hip circles - standing, performing hip rotation."""
    img, draw = create_base_image()
    draw_ground(draw, 430)
    
    joints = {
        'head': (256, 95),
        'neck': (256, 130),
        'l_shoulder': (226, 135), 'r_shoulder': (286, 135),
        'l_elbow': (210, 175), 'r_elbow': (302, 175),
        'l_hand': (220, 210), 'r_hand': (292, 210),
        'hip': (265, 260),
        'l_knee': (235, 340), 'r_knee': (295, 340),
        'l_foot': (225, 425), 'r_foot': (305, 425),
    }
    
    draw_body(img, draw, joints)
    
    # Circular arrow around hips
    cx, cy = 265, 260
    r = 45
    points = []
    for i in range(0, 30):
        angle = math.radians(i * 12)
        x = cx + int(r * math.cos(angle))
        y = cy + int(r * 0.6 * math.sin(angle))
        points.append((x, y))
    
    for i in range(len(points) - 1):
        draw.line([points[i], points[i+1]], fill=ARROW_COLOR, width=3)
    
    if len(points) >= 2:
        draw_arrow(draw, points[-2], points[-1], ARROW_COLOR, 3)
    
    add_subtitle(draw, "Circle hips in controlled rotation")
    add_title(draw, "HIP CIRCLES")
    save_image(img, "hip_circle.png")


def gen_shoulder_roll():
    """Shoulder rolls - standing, rolling shoulders."""
    img, draw = create_base_image()
    draw_ground(draw, 430)
    
    joints = {
        'head': (256, 95),
        'neck': (256, 130),
        'l_shoulder': (220, 138), 'r_shoulder': (292, 138),
        'l_elbow': (205, 200), 'r_elbow': (307, 200),
        'l_hand': (198, 260), 'r_hand': (314, 260),
        'hip': (256, 270),
        'l_knee': (240, 350), 'r_knee': (272, 350),
        'l_foot': (232, 425), 'r_foot': (280, 425),
    }
    
    draw_body(img, draw, joints)
    
    # Circular arrows around shoulders
    for sx in [220, 292]:
        cx, cy = sx, 138
        r = 28
        points = []
        for i in range(0, 20):
            angle = math.radians(-90 + i * 18)
            x = cx + int(r * math.cos(angle))
            y = cy + int(r * math.sin(angle))
            points.append((x, y))
        
        for i in range(len(points) - 1):
            draw.line([points[i], points[i+1]], fill=ARROW_COLOR, width=2)
        
        if len(points) >= 2:
            draw_arrow(draw, points[-2], points[-1], ARROW_COLOR, 2)
    
    add_subtitle(draw, "Roll shoulders backward smoothly")
    add_title(draw, "SHOULDER ROLLS")
    save_image(img, "shoulder_roll.png")


def gen_hamstring_stretch():
    """Hamstring stretch - standing, one leg extended on surface."""
    img, draw = create_base_image()
    draw_ground(draw, 420)
    
    # Standing stretch reaching toward extended foot
    joints = {
        'head': (220, 155),
        'neck': (235, 185),
        'l_shoulder': (240, 192), 'r_shoulder': (240, 192),
        'l_elbow': (275, 210), 'r_elbow': (275, 210),
        'l_hand': (320, 225), 'r_hand': (320, 225),
        'hip': (250, 280),
        'l_knee': (235, 350), 'r_knee': (340, 270),
        'l_foot': (230, 415), 'r_foot': (420, 280),
    }
    
    draw_body(img, draw, joints)
    
    # Elevated surface for foot
    draw.rectangle([400, 280, 445, 420], fill=(35, 35, 60), outline=(50, 50, 80))
    
    # Stretch indication
    draw_arrow(draw, (285, 200), (325, 218), ARROW_COLOR)
    
    add_subtitle(draw, "Extend leg, reach toward toes")
    add_title(draw, "HAMSTRING STRETCH")
    save_image(img, "hamstring_stretch.png")


def gen_spinal_twist():
    """Spinal twist - seated twist."""
    img, draw = create_base_image()
    draw_ground(draw, 400)
    
    # Seated, twisting torso
    joints = {
        'head': (240, 130),
        'neck': (250, 165),
        'l_shoulder': (225, 170), 'r_shoulder': (275, 170),
        'l_elbow': (195, 210), 'r_elbow': (315, 215),
        'l_hand': (180, 250), 'r_hand': (340, 250),
        'hip': (260, 300),
        'l_knee': (200, 330), 'r_knee': (330, 310),
        'l_foot': (170, 395), 'r_foot': (350, 395),
    }
    
    draw_body(img, draw, joints)
    
    # Rotation arrow around torso
    cx, cy = 250, 200
    draw_curved_arrow(draw, (cx, cy), 55, -30, 120, ARROW_COLOR)
    
    add_subtitle(draw, "Seated twist, gentle rotation")
    add_title(draw, "SPINAL TWIST")
    save_image(img, "spinal_twist.png")


def gen_child_pose():
    """Child's pose - person kneeling, arms extended forward."""
    img, draw = create_base_image()
    draw_ground(draw, 390)
    
    # Kneeling, body folded forward, arms extended
    joints = {
        'head': (160, 310),
        'neck': (185, 310),
        'l_shoulder': (200, 305), 'r_shoulder': (200, 315),
        'l_elbow': (150, 295), 'r_elbow': (150, 325),
        'l_hand': (95, 290), 'r_hand': (95, 330),
        'hip': (330, 310),
        'l_knee': (370, 355), 'r_knee': (370, 355),
        'l_foot': (400, 385), 'r_foot': (400, 385),
    }
    
    draw_body(img, draw, joints)
    
    # Relaxation indicators - gentle wavy lines
    for i in range(5):
        x = 120 + i * 20
        y1 = 265 + int(5 * math.sin(i * 0.8))
        y2 = 260 + int(5 * math.sin(i * 0.8 + 1))
        draw.ellipse([x-2, y1-2, x+2, y1+2], fill=(0, 200, 200, 50))
    
    add_subtitle(draw, "Kneel, extend arms, relax")
    add_title(draw, "CHILD'S POSE")
    save_image(img, "child_pose.png")


# ============================================================
# Generate all images
# ============================================================

def main():
    exercises = [
        ("squat.png", gen_squat),
        ("pushup.png", gen_pushup),
        ("crunch.png", gen_crunch),
        ("plank.png", gen_plank),
        ("leg_raise.png", gen_leg_raise),
        ("mountain_climber.png", gen_mountain_climber),
        ("tai_chi.png", gen_tai_chi),
        ("glute_bridge.png", gen_glute_bridge),
        ("bird_dog.png", gen_bird_dog),
        ("cat_cow.png", gen_cat_cow),
        ("hip_circle.png", gen_hip_circle),
        ("shoulder_roll.png", gen_shoulder_roll),
        ("hamstring_stretch.png", gen_hamstring_stretch),
        ("spinal_twist.png", gen_spinal_twist),
        ("child_pose.png", gen_child_pose),
    ]
    
    print(f"Generating {len(exercises)} exercise illustrations...")
    print(f"Output directory: {OUTPUT_DIR}")
    print()
    
    for filename, gen_func in exercises:
        print(f"Generating {filename}...")
        try:
            gen_func()
        except Exception as e:
            print(f"  ERROR generating {filename}: {e}")
    
    print()
    print(f"Done! Generated {len(exercises)} exercise illustrations.")
    
    # Verify files
    files = os.listdir(OUTPUT_DIR)
    png_files = [f for f in files if f.endswith('.png')]
    print(f"PNG files in output directory: {len(png_files)}")
    for f in sorted(png_files):
        size = os.path.getsize(os.path.join(OUTPUT_DIR, f))
        print(f"  {f}: {size:,} bytes")


if __name__ == "__main__":
    main()
