Add-Type -AssemblyName System.Web

$baseUrl = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image"
$outputDir = "c:\Users\DELL\Desktop\game\tongguandaboss\public\assets\sprites"

$prompts = @{}

# Player sprites
$prompts["player_walk"] = "pixel art knight warrior walking pose, 32x32 sprite, blue armor with gold accents, sword in hand, facing right, transparent background, game sprite, 16-bit style, clean pixel art, no anti-aliasing"
$prompts["player_jump"] = "pixel art knight warrior jumping pose, 32x32 sprite, blue armor with gold accents, sword in hand, facing right, transparent background, game sprite, 16-bit style, dynamic jumping pose"
$prompts["player_attack"] = "pixel art knight warrior attacking pose, 32x32 sprite, blue armor with gold accents, swinging sword, facing right, transparent background, game sprite, 16-bit style, slash effect"

# Enemy sprites
$prompts["slime"] = "pixel art green slime monster, 28x28 sprite, cute blob creature, simple design, transparent background, game sprite, 16-bit pixel art style, kawaii"
$prompts["skeleton"] = "pixel art white skeleton warrior, 28x28 sprite, holding bone sword, skull face, transparent background, game sprite, 16-bit pixel art style"
$prompts["goblin"] = "pixel art green goblin creature, 28x28 sprite, pointy ears, mischievous look, holding dagger, transparent background, game sprite, 16-bit style"
$prompts["darkmage"] = "pixel art dark mage wizard, 28x28 sprite, purple robe, glowing eyes, holding staff, transparent background, game sprite, 16-bit style"
$prompts["armored_enemy"] = "pixel art armored dark knight enemy, 28x28 sprite, black plate armor, red plume, menacing, transparent background, game sprite, 16-bit style"

# Boss sprites
$prompts["boss_dragonknight"] = "pixel art dragon knight boss, 80x100 sprite, green dragon scales, wings, horns, holding greatsword, facing right, transparent background, game sprite, 16-bit style, imposing"
$prompts["boss_shadowlord"] = "pixel art shadow lord boss, 80x100 sprite, dark wraith, skull mask, scythe, purple energy, facing right, transparent background, game sprite, 16-bit style, ominous"
$prompts["boss_demonking"] = "pixel art demon king boss, 80x100 sprite, red lava armor, horns, fire aura, large wings, facing right, transparent background, game sprite, 16-bit style, terrifying"

# Backgrounds
$prompts["bg_grass"] = "pixel art grassland game background, 1024x640, blue sky to green ground gradient, distant mountains, fluffy clouds, pixel game background, 16-bit style, no characters"
$prompts["bg_dark"] = "pixel art dark forest game background, 1024x640, dark purple night sky, dark ground, eerie stars, pixel game background, 16-bit style, no characters"
$prompts["bg_fire"] = "pixel art hell fire game background, 1024x640, red orange dark sky, lava ground, dark atmosphere, pixel game background, 16-bit style, no characters"

# Items
$prompts["item_health"] = "pixel art red heart health pickup, 16x16 sprite, glowing, transparent background, game sprite, 16-bit pixel art"
$prompts["item_mana"] = "pixel art blue mana potion bottle, 16x16 sprite, glowing liquid, transparent background, game sprite, 16-bit pixel art"
$prompts["item_coin"] = "pixel art gold coin, 16x16 sprite, shiny metallic, transparent background, game sprite, 16-bit pixel art"

# Projectiles
$prompts["proj_bullet"] = "pixel art glowing yellow bullet projectile, 12x12 sprite, bright energy, transparent background, game sprite"
$prompts["proj_arrow"] = "pixel art arrow projectile, 16x8 sprite, wooden shaft, red tip feathers, transparent background, game sprite"
$prompts["proj_magic"] = "pixel art purple magic orb projectile, 12x12 sprite, glowing mystical aura, transparent background, game sprite"
$prompts["proj_fire"] = "pixel art fire ball projectile, 12x12 sprite, orange red flame glowing, transparent background, game sprite"
$prompts["proj_dark"] = "pixel art dark purple energy projectile, 12x12 sprite, menacing dark glow, transparent background, game sprite"

# Platforms
$prompts["platform_grass"] = "pixel art grass ground tile, seamless tileable, green grass top, brown dirt below, 256x64, game asset"
$prompts["platform_stone"] = "pixel art stone platform tile, seamless tileable, gray stone with moss, 256x64, game asset"

foreach ($key in $prompts.Keys) {
    $prompt = $prompts[$key]
    $encodedPrompt = [System.Web.HttpUtility]::UrlEncode($prompt)
    $url = "$baseUrl`?prompt=$encodedPrompt&image_size=square"
    
    $outputPath = Join-Path $outputDir "$key.png"
    
    Write-Host "Generating $key ..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $outputPath -UseBasicParsing
        Write-Host "  OK: $key.png"
    } catch {
        Write-Host "  FAIL: $key - $_"
    }
}

Write-Host ""
Write-Host "All sprites generated!"