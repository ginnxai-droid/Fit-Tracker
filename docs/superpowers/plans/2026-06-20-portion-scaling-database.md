# Portion-Based Nutrients Scaling & Food Database Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement portion-based nutrient scaling, add interactive unit selection (pieces vs. grams) to the custom food logger, automatically update calories/protein/fat in real-time, and expand database accuracy by adding fat values to all regional specialties.

**Architecture:** Update `REGIONAL_SPECIALTIES` in `data.js` to include the `fat` property. In `index.html`, replace the static grams input with a unified number field and unit selector. In `app.js`, implement standard portion weight lookups, a smart parser that identifies portion items, and a real-time conversion and recalculation listener.

**Tech Stack:** HTML5, Vanilla JavaScript, CSS3.

## Global Constraints
- Do not use external CSS or UI frameworks.
- Preserve all existing file structures and imports.
- Make all changes compatible with both local web browser execution and Android WebView assets.

---

### Task 1: Update Regional Specialties with Fat Nutritional Values
**Files:**
- Modify: [data.js](file:///d:/Antigravity%20Project/Fit%20tracker/data.js)

- [ ] **Step 1: Add fat properties to Maharashtrian dishes**
  Locate `maharashtra` array in `REGIONAL_SPECIALTIES` (lines 1317-1323) and add `fat` values:
  ```javascript
    "maharashtra": [
      { name: "Methi Zunka (1 serving)", calories: 150, protein: 7, fat: 8, warning: "Traditional chickpea flour paste with fenugreek. High fiber, healthy plant protein.", swap: "Jowar Bhakri instead of wheat chapatis" },
      { name: "Jowar Bhakri (1 flatbread)", calories: 120, protein: 3, fat: 1.5, warning: "Gluten-free, fiber-rich traditional millet flatbread. Safe complex carbs.", swap: "Eat with low-fat curd or dal" },
      { name: "Sprouts Usal (1 bowl / 150g)", calories: 180, protein: 12, fat: 6, warning: "Steamed mixed sprouts curry. Excellent plant-based protein & high fiber.", swap: "Keep oil minimal during tempering" },
      { name: "Moong Dal Chilla (2 pieces)", calories: 250, protein: 12, fat: 8, warning: "Clean, high-protein moong dal pancake. Great light meal option.", swap: "Add grated paneer for extra protein" },
      { name: "Roasted Chana Sprouts Chaat (1 bowl)", calories: 140, protein: 8, fat: 2, warning: "Unfried healthy snack. Rich in fiber, magnesium, and plant protein.", swap: "Avoid adding fried sev or oily chutneys" }
    ],
  ```

- [ ] **Step 2: Add fat properties to Delhi dishes**
  Locate `delhi_region` array (lines 1324-1330) and add `fat` values:
  ```javascript
    "delhi_region": [
      { name: "Paneer Tikka (Grilled, 4 pieces)", calories: 280, protein: 15, fat: 18, warning: "Grilled cottage cheese with bell peppers. High protein, excellent choice.", swap: "None! This is an excellent high-protein meal" },
      { name: "Chicken Tikka (Grilled, 4 pieces)", calories: 240, protein: 28, fat: 8, warning: "Tandoori grilled skinless chicken breast. High-quality lean protein, low fat.", swap: "None! Perfect high lean protein option" },
      { name: "Soya Chaap (Grilled, dry, 1 plate)", calories: 260, protein: 18, fat: 10, warning: "Soy protein chunks grilled dry without heavy cream or butter. Plant protein.", swap: "Ensure it is grilled dry, not cooked in rich gravy" },
      { name: "Dal Tadka with 1 Missi Roti", calories: 310, protein: 13, fat: 8, warning: "Missi Roti (chickpea-wheat flour mix) provides low glycemic index carbs.", swap: "Order without butter/ghee on top" },
      { name: "Mixed Vegetable Raita (1 bowl)", calories: 90, protein: 5, fat: 2, warning: "Low-fat yogurt with cucumber, tomatoes, and roasted cumin. Probiotic-rich.", swap: "Ensure low-fat curd is used" }
    ],
  ```

- [ ] **Step 3: Add fat properties to South India dishes**
  Locate `south_india` array (lines 1331-1337) and add `fat` values:
  ```javascript
    "south_india": [
      { name: "Moong Dal Pesarattu (1 dosa)", calories: 220, protein: 9, fat: 6, warning: "Whole green gram crepe. Rich in protein, complex carbs, and iron.", swap: "Use minimal oil on the tawa" },
      { name: "Steamed Oats Idli with Sambar (2 pieces)", calories: 180, protein: 8, fat: 2, warning: "Steamed oats-based idli with vegetable-rich dal sambar. Safe and clean.", swap: "Add a side of curd for extra protein" },
      { name: "Ragi Mudde with Sambar (1 ball)", calories: 280, protein: 7, fat: 2, warning: "Finger millet ball. High fiber, calcium, and complex carbs. Low fat.", swap: "Add paneer chunks or boiled egg whites to increase protein" },
      { name: "Kala Chana Sundal (1 cup / 100g)", calories: 150, protein: 9, fat: 4, warning: "Boiled black chickpeas tempered with mustard seeds and fresh coconut. High fiber.", swap: "Keep oil minimal during tempering" },
      { name: "Kerala Grilled Fish (150g)", calories: 180, protein: 24, fat: 6, warning: "Fish marinated in spices and shallow/baked. Rich in Omega-3 and lean protein.", swap: "Bake or grill instead of pan frying" }
    ],
  ```

- [ ] **Step 4: Add fat properties to East India dishes**
  Locate `east_india` array (lines 1338-1344) and add `fat` values:
  ```javascript
    "east_india": [
      { name: "Macher Jhol (Fish Curry, 1 serving)", calories: 240, protein: 20, fat: 10, warning: "Traditional light fish stew with cumin and ginger. Excellent lean protein.", swap: "Ensure minimal mustard oil is used during cooking" },
      { name: "Steamed Bhetki Paturi (1 piece / 120g)", calories: 190, protein: 22, fat: 8, warning: "Fish marinated in mustard paste and steamed in banana leaves. Low fat, high protein.", swap: "None! The steaming process keeps it extremely healthy" },
      { name: "Chana Kabli (1 bowl)", calories: 160, protein: 8, fat: 2, warning: "Boiled Bengal gram salad with chopped onions, tomatoes, and lemon. Fiber-rich.", swap: "Avoid any fried toppings or heavy oil dressings" },
      { name: "Paneer Paturi (Steamed, 100g)", calories: 220, protein: 14, fat: 14, warning: "Cottage cheese marinated in mustard and steamed in banana leaves. High protein.", swap: "Use low-fat paneer to reduce saturated fats" },
      { name: "Mixed Veg Dalma (1 bowl)", calories: 150, protein: 8, fat: 3, warning: "Traditional Odia lentil dish loaded with vegetables. High fiber and plant protein.", swap: "Prepare with very little ghee/oil tempering" }
    ],
  ```

- [ ] **Step 5: Add fat properties to West India dishes**
  Locate `west_india` array (lines 1345-1351) and add `fat` values:
  ```javascript
    "west_india": [
      { name: "Steamed Khaman Dhokla (3 pieces)", calories: 180, protein: 6, fat: 4, warning: "Steamed fermented chickpea batter. Light, easily digestible, low fat.", swap: "Pair with double toned curd to boost protein" },
      { name: "Khandvi (4 pieces)", calories: 120, protein: 4, fat: 4, warning: "Steamed chickpea flour rolls. Low calorie, low fat, and healthy.", swap: "Add roasted sesame seeds for healthy fats, avoid heavy oil tempering" },
      { name: "Bajra Rotla (1 flatbread)", calories: 130, protein: 4, fat: 2, warning: "Traditional pearl millet flatbread. Rich in fiber, iron, and magnesium.", swap: "Serve with low-fat garlic chutney and skimmed curd" },
      { name: "Sprouted Moong Salad (1 bowl)", calories: 110, protein: 8, fat: 1, warning: "Fresh sprouted moong beans with onion, cucumber, tomato, and lime. Highly nutritious.", swap: "Eat raw or lightly steamed" },
      { name: "Paneer Lifafa (Grilled, 1 serving)", calories: 260, protein: 16, fat: 12, warning: "Whole wheat wrap folded with grilled paneer and chopped vegetables. Balanced meal.", swap: "Use non-stick pan to grill dry without butter" }
    ],
  ```

- [ ] **Step 6: Add fat properties to Default India dishes**
  Locate `default_india` array (lines 1352-1357) and add `fat` values:
  ```javascript
    "default_india": [
      { name: "Moong Dal Chilla (2 pieces)", calories: 260, protein: 12, fat: 8, warning: "Great clean option. Low-fat, plant protein.", swap: "None! This is an excellent high-protein meal" },
      { name: "Paneer Tikka (Grilled, 4 pieces)", calories: 280, protein: 15, fat: 18, warning: "Excellent high protein option! Highly clinical approved.", swap: "None! This is an excellent high-protein meal" },
      { name: "Grilled Chicken Salad (1 serving)", calories: 240, protein: 26, fat: 6, warning: "High lean protein option, keep oil dress/mayo low.", swap: "None! This is an excellent high-protein meal" },
      { name: "Boiled Egg (Large, 2)", calories: 156, protein: 12, fat: 10, warning: "Clean option, yolks contain some cholesterol.", swap: "4 egg whites (whites contain zero fat)" }
    ]
  ```

- [ ] **Step 7: Commit Task 1**
  Run:
  ```bash
  git add data.js
  git commit -m "feat: add fat values to all regional specialties in food database"
  ```

---

### Task 2: Custom Food Logger Unit Dropdown Layout
**Files:**
- Modify: [index.html](file:///d:/Antigravity%20Project/Fit%20tracker/index.html)

- [ ] **Step 1: Replace Grams input block with Grams/Pieces dropdown layout**
  Locate the custom food logger inputs (around lines 810-820) and replace:
  ```html
              <div class="input-group">
                <label id="foodLogGramsLabel" for="foodLogGrams">Portion / Unit</label>
                <div style="display: flex; gap: 4px;">
                  <input type="number" id="foodLogGrams" class="input" style="flex: 1; min-width: 50px;" placeholder="100" min="0">
                  <select id="foodLogUnit" class="input" style="padding: 0 var(--space-xs); background: var(--bg-elevated); color: var(--text); border-color: var(--border-subtle); font-size: 11px; width: 85px;">
                    <option value="g">Grams</option>
                    <option value="pcs">Pieces</option>
                  </select>
                </div>
              </div>
  ```

- [ ] **Step 2: Commit Task 2**
  Run:
  ```bash
  git add index.html
  git commit -m "feat: replace static grams input with unified quantity and unit selector"
  ```

---

### Task 3: Implement Portion Scaling & Conversion Logic
**Files:**
- Modify: [app.js](file:///d:/Antigravity%20Project/Fit%20tracker/app.js)

- [ ] **Step 1: Add getStandardPortionWeight function to app.js**
  Insert the helper at the end of `app.js` or in a utilities block:
  ```javascript
  function getStandardPortionWeight(foodName) {
    const nameLower = foodName.toLowerCase();
    if (nameLower.includes('roti') || nameLower.includes('chapati') || nameLower.includes('bhakri') || nameLower.includes('rotla') || nameLower.includes('phulka')) {
      return 45; // 45g per roti/flatbread (medium)
    }
    if (nameLower.includes('egg') || nameLower.includes('omelette')) {
      return 50; // 50g per egg
    }
    if (nameLower.includes('naan')) {
      return 80; // 80g per naan
    }
    if (nameLower.includes('paratha')) {
      return 100; // 100g per paratha
    }
    if (nameLower.includes('chilla')) {
      return 60; // 60g per chilla
    }
    if (nameLower.includes('dosa')) {
      return 80; // 80g per dosa
    }
    if (nameLower.includes('idli')) {
      return 40; // 40g per idli
    }
    if (nameLower.includes('samosa')) {
      return 50; // 50g per samosa
    }
    if (nameLower.includes('vada pav')) {
      return 120; // 120g per vada pav
    }
    if (nameLower.includes('vada')) {
      return 40; // 40g per vada
    }
    if (nameLower.includes('dhokla')) {
      return 30; // 30g per piece
    }
    if (nameLower.includes('gulab jamun') || nameLower.includes('rasgulla')) {
      return 40; // 40g per piece
    }
    if (nameLower.includes('whey') || nameLower.includes('protein')) {
      return 30; // 30g per scoop
    }
    if (nameLower.includes('milk') || nameLower.includes('lassi') || nameLower.includes('chaas') || nameLower.includes('buttermilk')) {
      return 250; // 250ml per glass
    }
    if (nameLower.includes('rice') || nameLower.includes('biryani') || nameLower.includes('poha') || nameLower.includes('upma') || nameLower.includes('khichdi')) {
      return 150; // 150g per plate/katori/bowl
    }
    if (nameLower.includes('dal') || nameLower.includes('curry') || nameLower.includes('sambar') || nameLower.includes('usal') || nameLower.includes('bhurji') || nameLower.includes('paneer') || nameLower.includes('chicken') || nameLower.includes('fish')) {
      return 150; // 150g per bowl/katori
    }
    return 100; // Default fallback weight
  }
  ```

- [ ] **Step 2: Update fillFoodLogger to support fuzzy portion matching and unit select**
  Locate `fillFoodLogger` (around lines 4537-4589) and replace with:
  ```javascript
  function fillFoodLogger(name, calories, protein, fat = 0) {
    const nameInput = document.getElementById('foodLogName');
    const gramsInput = document.getElementById('foodLogGrams');
    const caloriesInput = document.getElementById('foodLogCalories');
    const proteinInput = document.getElementById('foodLogProtein');
    const fatInput = document.getElementById('foodLogFat');
    const unitSelect = document.getElementById('foodLogUnit');

    if (nameInput) nameInput.value = name;
    if (caloriesInput) caloriesInput.value = calories;
    if (proteinInput) proteinInput.value = protein;
    if (fatInput) fatInput.value = fat;

    let baseUnit = 'g';
    let baseQty = 100;

    const lowerName = name.toLowerCase();
    const portionKeywords = [
      'piece', 'pieces', 'pcs',
      'plate', 'plates',
      'scoop', 'scoops',
      'glass', 'glasses',
      'katori', 'katoris',
      'cup', 'cups',
      'bowl', 'bowls',
      'serving', 'servings',
      'portion', 'portions',
      'flatbread', 'flatbreads',
      'roti', 'rotis',
      'naan', 'naans',
      'bhakri', 'bhakris',
      'rotla', 'rotlas',
      'chapatis', 'chapati',
      'chilla', 'chillas',
      'dosa', 'dosas',
      'egg', 'eggs',
      'samosa', 'samosas',
      'vada', 'vadas',
      'dhokla', 'dhoklas',
      'idli', 'idlis',
      'gulab jamun', 'rasgulla', 'rasgullas',
      'bhature', 'bhaturas'
    ];
    
    const hasPortionWord = portionKeywords.some(kw => lowerName.includes(kw));

    if (hasPortionWord) {
      baseUnit = 'pcs';
      baseQty = 1;
      let match = name.match(/(\d+(?:\.\d+)?)\s*(piece|pieces|pcs|plate|plates|glass|glasses|katori|katoris|cup|cups|bowl|bowls|roti|rotis|naan|naans|bhakri|bhakris|flatbread|flatbreads|rotla|rotlas|chapati|chapatis|chilla|chillas|dosa|dosas|egg|eggs|samosa|samosas|vada|vadas|dhokla|dhoklas|idli|idlis|scoop|scoops|serving|servings|bhature|bhaturas)/i);
      if (match) {
        baseQty = parseFloat(match[1]);
      } else {
        match = name.match(/\((\d+(?:\.\d+)?)\s*\)/) || name.match(/\b(\d+(?:\.\d+)?)\b/);
        if (match) {
          baseQty = parseFloat(match[1]);
        }
      }
    } else {
      baseUnit = 'g';
      baseQty = 100;
      const match = name.match(/(\d+)\s*g/i);
      if (match) {
        baseQty = parseInt(match[1]);
      }
    }

    if (unitSelect) {
      unitSelect.value = baseUnit;
    }

    if (gramsInput) {
      gramsInput.value = baseQty;
      gramsInput.dataset.baseQty = baseQty;
      gramsInput.dataset.baseUnit = baseUnit;
      gramsInput.dataset.baseCalories = calories;
      gramsInput.dataset.baseProtein = protein;
      gramsInput.dataset.baseFat = fat;
    }

    let tipBox = document.getElementById('foodLogWarningTip');
    if (!tipBox) {
      tipBox = document.createElement('div');
      tipBox.id = 'foodLogWarningTip';
      tipBox.style.marginTop = 'var(--space-xs)';
      tipBox.style.marginBottom = 'var(--space-xs)';
      tipBox.style.fontSize = '12px';
      tipBox.style.lineHeight = '1.4';
      const btn = document.getElementById('btnLogCustomFood');
      if (btn) {
        btn.parentNode.insertBefore(tipBox, btn);
      }
    }
    
    const dbItem = FOOD_DATABASE.find(item => item.name === name);
    const maharashSpecialty = REGIONAL_SPECIALTIES.maharashtra.find(item => item.name === name);
    const itemRef = dbItem || maharashSpecialty;
    
    if (itemRef && itemRef.warning) {
      tipBox.innerHTML = `
        <div style="background: var(--bg-elevated); border-left: 3px solid var(--warning); padding: var(--space-sm); border-radius: var(--radius-sm);">
          <strong style="color: var(--warning); font-size: 11px; text-transform: uppercase;">Coach Tip:</strong>
          <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 11px;">${itemRef.warning}</p>
        </div>
      `;
    } else {
      tipBox.innerHTML = '';
    }
  }
  ```

- [ ] **Step 3: Implement recalculateNutrients function**
  Insert this recalculation function in `app.js`:
  ```javascript
  function recalculateNutrients() {
    const gramsInput = document.getElementById('foodLogGrams');
    const unitSelect = document.getElementById('foodLogUnit');
    const caloriesInput = document.getElementById('foodLogCalories');
    const proteinInput = document.getElementById('foodLogProtein');
    const fatInput = document.getElementById('foodLogFat');
    const nameInput = document.getElementById('foodLogName');

    if (!gramsInput || !unitSelect || !caloriesInput || !proteinInput || !fatInput) return;

    const currentVal = parseFloat(gramsInput.value) || 0;
    const currentUnit = unitSelect.value;

    const baseQty = parseFloat(gramsInput.dataset.baseQty || 100);
    const baseUnit = gramsInput.dataset.baseUnit || 'g';
    const baseCalories = parseFloat(gramsInput.dataset.baseCalories || 0);
    const baseProtein = parseFloat(gramsInput.dataset.baseProtein || 0);
    const baseFat = parseFloat(gramsInput.dataset.baseFat || 0);

    if (currentVal <= 0) {
      caloriesInput.value = 0;
      proteinInput.value = 0;
      fatInput.value = 0;
      return;
    }

    let factor = 1;

    if (currentUnit === baseUnit) {
      factor = currentVal / baseQty;
    } else if (currentUnit === 'g' && baseUnit === 'pcs') {
      const foodName = nameInput ? nameInput.value : '';
      const portionWeight = getStandardPortionWeight(foodName);
      const totalBaseWeight = baseQty * portionWeight;
      factor = currentVal / totalBaseWeight;
    } else if (currentUnit === 'pcs' && baseUnit === 'g') {
      const foodName = nameInput ? nameInput.value : '';
      const portionWeight = getStandardPortionWeight(foodName);
      const totalInputWeight = currentVal * portionWeight;
      factor = totalInputWeight / baseQty;
    }

    caloriesInput.value = Math.round(baseCalories * factor);
    proteinInput.value = Math.round(baseProtein * factor);
    fatInput.value = Math.round(baseFat * factor);
  }
  ```

- [ ] **Step 4: Bind event listeners to input changes and unit changes**
  Locate the `gramsInput` listener binding inside `bindLocationAwareLoggerEvents()` (around lines 4690-4710) and replace it with:
  ```javascript
    const unitSelect = document.getElementById('foodLogUnit');
    if (gramsInput) {
      gramsInput.addEventListener('input', recalculateNutrients);
    }

    if (unitSelect) {
      unitSelect.addEventListener('change', () => {
        const gramsInput = document.getElementById('foodLogGrams');
        const nameInput = document.getElementById('foodLogName');
        if (gramsInput && nameInput) {
          const currentVal = parseFloat(gramsInput.value) || 0;
          const currentUnit = unitSelect.value;
          const baseUnit = gramsInput.dataset.baseUnit || 'g';
          const baseQty = parseFloat(gramsInput.dataset.baseQty || 100);
          
          if (currentVal > 0) {
            const foodName = nameInput.value;
            const portionWeight = getStandardPortionWeight(foodName);
            if (currentUnit === 'g' && baseUnit === 'pcs') {
              gramsInput.value = Math.round(currentVal * portionWeight);
            } else if (currentUnit === 'pcs' && baseUnit === 'pcs') {
              gramsInput.value = baseQty;
            } else if (currentUnit === 'pcs' && baseUnit === 'g') {
              gramsInput.value = (currentVal / portionWeight).toFixed(1);
            } else if (currentUnit === 'g' && baseUnit === 'g') {
              gramsInput.value = baseQty;
            }
          }
        }
        recalculateNutrients();
      });
    }
  ```

- [ ] **Step 5: Commit Task 3**
  Run:
  ```bash
  git add app.js
  git commit -m "feat: implement smart portion conversion and automatic scaling logic"
  ```

---

### Task 4: Sync Assets, Compile & Verify
**Files:**
- None (Utility task)

- [ ] **Step 1: Sync Assets**
  Run: `py sync_assets.py`

- [ ] **Step 2: Build Android APK**
  Run: `.\gradlew assembleDebug` inside `d:\Antigravity Project\Fit tracker\fit-tracker-android`

- [ ] **Step 3: Verify with automated E2E tests**
  Start background server `node server.js` in scratch directory and run:
  Run: `node e2e_qa_test.js`

- [ ] **Step 4: Update build APKs**
  Run:
  ```powershell
  Copy-Item -Path "fit-tracker-android\app\build\outputs\apk\debug\app-debug.apk" -Destination "fit-tracker.apk" -Force
  Copy-Item -Path "fit-tracker-android\app\build\outputs\apk\debug\app-debug.apk" -Destination "fit-tracker-professional.apk" -Force
  ```

- [ ] **Step 5: Commit and push changes**
  Run:
  ```bash
  git add fit-tracker.apk fit-tracker-professional.apk
  git commit -m "build: compile and update binary APKs with portion nutrient scaling"
  git push origin main
  ```
