# Design Specification: Portion-Based Nutrients Scaling & Food Database Accuracy

## Goal
Improve the food database accuracy by adding fat values to all regional specialties, and implement an interactive portion-to-gram scaling system that enables users to log foods either in standard pieces/portions (e.g. 1 flatbread, 2 eggs) or in weighed grams.

---

## Proposed System Changes

### 1. Database Enhancements

#### [data.js](file:///d:/Antigravity%20Project/Fit%20tracker/data.js)
* Add a `fat` property to all dishes in `REGIONAL_SPECIALTIES` under all regions ("maharashtra", "delhi_region", "south_india", "east_india", "west_india", "default_india").

---

### 2. User Interface Updates

#### [index.html](file:///d:/Antigravity%20Project/Fit%20tracker/index.html)
* Replace the static Grams input label and field inside the Custom Food Logger Card with a horizontal layout containing a number input and a unit selection dropdown:
  ```html
  <div class="input-group">
    <label for="foodLogGrams">Portion / Unit</label>
    <div style="display: flex; gap: 4px;">
      <input type="number" id="foodLogGrams" class="input" style="flex: 1; min-width: 50px;" placeholder="100" min="0">
      <select id="foodLogUnit" class="input" style="padding: 0 var(--space-xs); background: var(--bg-elevated); color: var(--text); border-color: var(--border-subtle); font-size: 11px; width: 85px;">
        <option value="g">Grams</option>
        <option value="pcs">Pieces</option>
      </select>
    </div>
  </div>
  ```

---

### 3. Application Logic Updates

#### [app.js](file:///d:/Antigravity%20Project/Fit%20tracker/app.js)

* **Portion Weight Lookup Table**:
  Implement `getStandardPortionWeight(foodName): Number` containing standard portion weights for rotis/flatbreads (~45g), eggs (~50g), dosas (~80g), idlis (~40g), etc.
  
* **Fuzzy Portion Unit Detector**:
  Update `fillFoodLogger()` to match a wider range of portion words: `flatbread`, `roti`, `naan`, `chapati`, `bhakri`, `rotla`, `egg`, `eggs`, `dosa`, `chilla`, `idli`, `samosa`, `dhokla`, `serving`, `bowl`, `katori`, `glass`, `piece`, etc. Set the `#foodLogUnit` selector to `'pcs'` if a portion word is matched, otherwise `'g'`.

* **Smart Unit Conversion UX**:
  * Bind a `change` event listener to `#foodLogUnit` selector. When units are toggled:
    * If switching from `pcs` to `g`, multiply the input quantity by `portionWeight` (e.g. `2 pcs` -> `90g`).
    * If switching from `g` to `pcs`, divide the input quantity by `portionWeight` (e.g. `90g` -> `2 pcs` or `2.0 pcs`).
  
* **Dynamic Recalculations**:
  Implement `recalculateNutrients()` to compute the factor and scale calories, protein, and fat:
    * If `currentUnit === baseUnit`: `factor = currentVal / baseQty`.
    * If `currentUnit === 'g' && baseUnit === 'pcs'`: `factor = currentVal / (baseQty * portionWeight)`.
    * If `currentUnit === 'pcs' && baseUnit === 'g'`: `factor = (currentVal * portionWeight) / baseQty`.
