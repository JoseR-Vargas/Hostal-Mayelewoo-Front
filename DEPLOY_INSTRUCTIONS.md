# 🚀 Instrucciones de Deployment - Hostal Mayelewoo

## 📋 PASO A PASO PARA DEPLOYMENT

### 1. Preparación Final del Código

Actualiza el dominio del frontend en `src/main.ts`:
```typescript
// Línea ~28, reemplazar:
'https://your-frontend-domain.com'
// Por tu dominio real, ejemplo:
'https://mayelewoo-frontend.netlify.app'
```

### 2. Backend - Deploy a Render

1. **Crear servicio en Render:**
   - Conectar repositorio GitHub
   - Tipo: Web Service
   - Entorno: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`

2. **Configurar variables de entorno:**
   ```
   MONGO_URI=mongodb+srv://hostalmayelewoo_db_user:78Gmachillanda@hostal.dtueoma.mongodb.net/hostal_mayelewoo
   JWT_SECRET=mayelewoo_secret_key_2025
   NODE_ENV=production
   BASE_URL=https://tu-app-backend.onrender.com
   ADMIN_EMAIL=admin@mayelewoo.com
   ADMIN_PASSWORD=MayeleWoo2025!
   ```

### 3. Frontend - Deploy (ejemplo con Netlify)

1. **Preparar para deploy:**
   - Los archivos están listos para subir directamente
   - No requiere build process (es vanilla JS/HTML/CSS)

2. **Opciones de deployment:**

   **Opción A - Netlify (recomendado):**
   - Drag & drop de la carpeta `mayelewoo/`
   - Automáticamente tendrás HTTPS

   **Opción B - GitHub Pages:**
   - Push a repositorio
   - Activar GitHub Pages
   - Configurar custom domain si lo tienes

   **Opción C - Vercel:**
   - Import project
   - Deploy automático

### 4. Configuración Post-Deploy

1. **Actualizar CORS en backend** con la URL real del frontend
2. **Probar endpoints:**
   ```bash
   curl https://tu-backend.onrender.com/api/contadores
   curl https://tu-backend.onrender.com/api/vouchers
   ```

3. **Probar frontend completo:**
   - Login con: admin@mayelewoo.com / MayeleWoo2025!
   - Subir imagen de contador
   - Subir voucher
   - Verificar dashboards

## 🔧 Comandos útiles

**Build local del backend:**
```bash
cd mayelewoo_back/mayelewoo_back
npm run build
npm run start:prod
```

**Test de APIs:**
```bash
# Contadores
curl -X GET "https://tu-backend.onrender.com/api/contadores"

# Vouchers  
curl -X GET "https://tu-backend.onrender.com/api/vouchers"

# Login
curl -X POST "https://tu-backend.onrender.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mayelewoo.com","password":"MayeleWoo2025!"}'
```

## 🐛 Troubleshooting

**Si las imágenes no cargan:**
1. Verificar que BASE_URL esté correcta
2. Verificar CORS headers
3. Verificar que la carpeta uploads/ se cree correctamente

**Si hay errores 401/403:**
1. Verificar JWT_SECRET
2. Verificar autenticación en frontend

**Si no conecta frontend-backend:**
1. Verificar URLs en JS
2. Verificar CORS origins
3. Verificar que ambos servicios estén up

## 📱 URLs de Acceso

**Backend:** `https://tu-backend.onrender.com`
**Frontend:** `https://tu-frontend.netlify.app`

**Páginas principales:**
- `/` - Página principal
- `/login.html` - Login administrativo  
- `/dashboard.html` - Dashboard principal
- `/dashboard-luz.html` - Dashboard contadores
- `/vouchers.html` - Subir comprobantes
- `/contadores-luz.html` - Registrar medición

---

## ✅ ESTADO ACTUAL

**El proyecto está 95% listo para producción.**

Solo necesitas:
1. ✅ Deploy del backend (10 min)
2. ✅ Deploy del frontend (5 min) 
3. ✅ Actualizar CORS (2 min)
4. ✅ Testing (10 min)

**Total: ~30 minutos para estar en producción completa**
