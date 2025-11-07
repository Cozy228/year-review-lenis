# Deprecated Sass Files

This directory contains the original Sass files from the project before migration to Tailwind CSS v4.

**Date Archived:** ${new Date().toLocaleDateString('zh-CN')}

---

## 📁 Directory Structure

```
deprecated/
├── styles/          # Original global Sass files
│   ├── _colors.scss
│   ├── _easings.scss
│   ├── _fonts.scss
│   ├── _font-style.scss
│   ├── _functions.scss
│   ├── _layout.scss
│   ├── _reset.scss
│   ├── _scroll.scss
│   ├── _spacers.scss
│   ├── _themes.scss
│   ├── _utils.scss
│   ├── _variables.scss
│   └── global.scss
│
├── components/      # Original component Sass modules
│   ├── appear-title.module.scss
│   ├── button.module.scss
│   ├── card.module.scss
│   ├── cursor.module.scss
│   ├── feature-cards.module.scss
│   ├── footer.module.scss
│   ├── horizontal-slides.module.scss
│   ├── intro.module.scss
│   ├── layout.module.scss
│   ├── list-item.module.scss
│   ├── modal.module.scss
│   └── scrollbar.module.scss
│
└── sections/        # Original section Sass modules
    └── home.module.scss
```

---

## 🔄 Migration Status

**Status:** ✅ **Migration Complete**

All Sass files have been successfully migrated to Tailwind CSS v4 with pure CSS.

### Migrated To:

- **Global Styles:**
  - `src/styles/tailwind.css` - Tailwind v4 entry point
  - `src/styles/theme.css` - CSS variables and design tokens
  - `src/styles/reset.css` - CSS reset
  - `src/styles/base.css` - Base global styles
  - `src/styles/utilities.css` - Custom utilities
  - `src/styles/bridge.css` - Bridge styles

- **Component Styles:**
  - All `.module.scss` → `.module.css`
  - Pure CSS with standard properties
  - No Sass dependencies

- **Section Styles:**
  - `home.module.scss` → `home.module.css`

---

## 📊 Migration Details

### What Changed:

1. **Sass Functions → CSS Calculations**
   ```scss
   // Before
   font-size: mobile-vw(14px);
   ```
   ```css
   /* After */
   font-size: 3.7333333333vw;
   ```

2. **Sass Mixins → Media Queries**
   ```scss
   // Before
   @include desktop { ... }
   ```
   ```css
   /* After */
   @media (min-width: 800px) { ... }
   ```

3. **Sass Nesting → Flat Selectors**
   ```scss
   // Before
   .button {
     .text { ... }
   }
   ```
   ```css
   /* After */
   .button .text { ... }
   ```

4. **Sass Variables → CSS Variables**
   ```scss
   // Before
   $pink: rgb(255, 152, 162);
   ```
   ```css
   /* After */
   :root {
     --pink: rgb(255, 152, 162);
   }
   ```

---

## 📚 Documentation

For detailed migration information, see:

- `SASS_TO_TAILWIND_MIGRATION_REPORT.md` - Complete migration report
- `MIGRATION_COMPLETE.md` - Migration completion summary
- `FINAL_FIX_REPORT.md` - Final fixes and troubleshooting
- `CSS_FIX_SUMMARY.md` - CSS issues and solutions
- `QUICK_FIX.md` - Quick fixes for specific issues

---

## ⚠️ Important Notes

### Do NOT:
- ❌ Use these files in the build process
- ❌ Import these files in any component
- ❌ Restore Sass dependencies

### These Files Are Kept For:
- ✅ Reference during development
- ✅ Comparison with migrated CSS
- ✅ Historical record
- ✅ Potential rollback (if needed)

---

## 🗑️ Safe to Delete?

**Yes**, these files are safe to delete if:
1. ✅ Migration is verified and working
2. ✅ All features are tested
3. ✅ Visual regression tests pass
4. ✅ Team agrees to remove

**Recommended:**
Keep for at least 2-4 weeks after migration to ensure stability, then delete.

---

## 🔄 Rollback Procedure (If Needed)

In case you need to rollback to Sass:

1. Restore Sass dependency:
   ```bash
   pnpm add -D sass
   ```

2. Restore Sass files:
   ```bash
   mv deprecated/styles/*.scss src/styles/
   mv deprecated/components/*.scss src/components/
   mv deprecated/sections/*.scss src/sections/
   ```

3. Update imports in components from `.css` back to `.scss`

4. Restore Vite config Sass preprocessor settings

---

_These files were archived as part of the Sass to Tailwind CSS v4 migration._
_Migration completed: ${new Date().toLocaleDateString('zh-CN')}_

