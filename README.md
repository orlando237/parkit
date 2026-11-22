# PARKIT · App móvil (PWA)

Aplicación para encontrar y apartar cupos de parqueo de motos en el campus. Es una PWA: se abre en el navegador del celular y se puede instalar en la pantalla de inicio.

## Requisitos

- Node.js 20 o superior (probado con Node 24).

## Desarrollo

```bash
npm install
npm run dev
```

Vite muestra dos direcciones:

- `http://localhost:5173/` para el mismo computador.
- `http://<IP-de-tu-red>:5173/` para abrirla desde el celular conectado al mismo Wi-Fi.

En el celular, desde Chrome o Safari: menú → **Agregar a pantalla de inicio** para usarla como app.

## Producción

```bash
npm run build     # genera dist/ con service worker y manifest
npm run preview   # sirve dist/ localmente
```

Para desplegar, sube el contenido de `dist/` a cualquier hosting estático (Netlify, Vercel, Firebase Hosting, GitHub Pages). El service worker funciona solo sobre HTTPS o `localhost`.

## Generar APK (Android)

### Opción 1: GitHub Actions (Automático - Recomendado)

Este proyecto incluye un workflow de GitHub Actions que compila el APK automáticamente.

1. Crea una **nuevo repositorio** en GitHub
2. Haz push del código al repositorio
3. Ve a la pestaña **"Actions"** en GitHub
4. Busca el workflow **"Build Android APK"**
5. Descarga el archivo `app-debug.apk` desde los artifacts

### Opción 2: EAS Build (Nube completa)

Si prefieres usar Expo Application Services:

1. Instala EAS CLI: `npm install -g eas-cli`
2. Ejecuta: `eas build --platform android`

### Opción 3: Local (requiere Android SDK)

```bash
npm run build
npx cap copy android
cd android
./gradlew assembleDebug
# APK en: app/build/outputs/apk/debug/app-debug.apk
```

---

## Stack

| Pieza | Uso |
| --- | --- |
| Vite 8 + React 19 + TypeScript | Base de la app |
| Tailwind CSS v4 | Utilidades y sistema visual (`.lg-*` en `src/index.css`) |
| Zustand | Estado global con persistencia en `localStorage` |
| Framer Motion | Transiciones entre pantallas y hoja de reporte |
| React Three Fiber + three | Guía 3D a pie |
| vite-plugin-pwa | Manifest, iconos e instalación en el celular |

## Estructura

```
src/
  domain/      tipos, datos de zonas y selectores (estadísticas, márgenes, posiciones)
  store/       useParkit (cupos, reportes, alertas), useNav (pantallas), useGuide (recorrido 3D)
  components/  navegación, toast, hoja de reporte, cabeceras
  screens/     Zonas, Cupo, Zona, Mi puesto, Inicio, Mapas, Guía 3D
  scene/       campus 3D, recorrido y overlays del HUD
```

## Funcionalidad

- **Zonas**: mapa del campus con disponibilidad, recomendación según sombra/sol y hora de clase, lista ordenada.
- **Cupo**: selección de minibloque con cupo sugerido, apartado por 10 minutos.
- **Zona**: plano de sub-bloques y minibloques, inspector y ruta 3D al cupo elegido.
- **Mi puesto**: cupo activo, tiempo parqueado, liberar cupo y alerta a vigilancia.
- **Mapas**: ruta a pie a la moto y vista del campus.
- **Guía 3D**: recorrido animado con cámara, metros restantes y aviso de llegada.
- **Reportes**: cualquier motociclista puede reportar el estado de una zona; el reporte recalcula la disponibilidad y queda en el historial.

Los datos viven en el dispositivo (`localStorage`, clave `parkit-v1`). Para volver al estado inicial, borra esa clave desde las herramientas del navegador.
