# bundle-check

Analizează bundle-ul web Expo pentru performanță — dimensiune, lazy loading, dependențe inutile.

## Pași

### 1. Build Web (dacă dist/ lipsește sau e vechi)
```bash
ls -la /c/Users/Albert/Desktop/VoltCheck/dist/ 2>/dev/null | head -5
# Dacă lipsește sau mai vechi de 24h:
cd /c/Users/Albert/Desktop/VoltCheck && npx expo export --platform web 2>&1 | tail -10
```

### 2. Analiză Dimensiune Bundle
```bash
# Total bundle
du -sh /c/Users/Albert/Desktop/VoltCheck/dist/

# Top 15 fișiere JS cele mai mari
find /c/Users/Albert/Desktop/VoltCheck/dist -name "*.js" -exec ls -lh {} \; | sort -k5 -rh | head -15

# Fișiere mai mari de 200KB
find /c/Users/Albert/Desktop/VoltCheck/dist -name "*.js" -size +200k -exec ls -lh {} \;
```

### 3. Verificare Lazy Loading în Cod
Caută în `app/` și `components/`:
```bash
grep -rn "React.lazy\|dynamic import\|import(" /c/Users/Albert/Desktop/VoltCheck/app \
  /c/Users/Albert/Desktop/VoltCheck/components --include=*.tsx | head -20

# Componente grele fără lazy loading (ReportRadar, RecallMap)
grep -rn "import.*ReportRadar\|import.*RecallMap\|import.*PDFKit\|import.*pdfkit" \
  /c/Users/Albert/Desktop/VoltCheck/app --include=*.tsx
```

### 4. Dependențe Grele
Verifică în `package.json` dependențele cu impact mare pe bundle web:
- `pdfkit` sau `react-native-pdf-lib` — inclusă în web bundle? Ar trebui exclusă (PDF-ul e server-side)
- `@google-cloud/vision` — nu trebuie în client niciodată
- Firebase SDK — importuri tree-shakeable? (`import { getFirestore } from 'firebase/firestore'` ✓ vs `import * from 'firebase'` ✗)

```bash
grep -rn "from 'firebase'" /c/Users/Albert/Desktop/VoltCheck/services \
  /c/Users/Albert/Desktop/VoltCheck/app --include=*.ts --include=*.tsx | head -20
```

### 5. Assets
```bash
# Imagini mari în assets
find /c/Users/Albert/Desktop/VoltCheck/assets -name "*.png" -o -name "*.jpg" | \
  xargs ls -lh 2>/dev/null | sort -k5 -rh | head -10
```

### 6. Raport
| Metric | Valoare | Target | Status |
|---|---|---|---|
| Total bundle size | XMB | <5MB | ✓/✗ |
| Chunk mai mare de 500KB | N chunks | 0 | ✓/✗ |
| Lazy loading folosit | Da/Nu | Da | ✓/✗ |
| Firebase imports corecte | ✓/✗ | ✓ | ✓/✗ |

**Recomandări de optimizare:** lista prioritizată
