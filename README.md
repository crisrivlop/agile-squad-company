# 🏢 Agile Squad Company

Orquestador multi-agente en **TypeScript** que permite operar una empresa de desarrollo de software autónoma impulsada por modelos locales de **Ollama** (`qwen2.5-coder`, `gemma4`) y los skills/prompts gobernados del ecosistema **Agile Squad**.

---

## 👥 Roles Especializados en la Empresa

1. **Product Owner Sentinel (`product_owner`):** Depuración y refinamiento de requerimientos con el Stakeholder.
2. **Senior Tech Architect (`tech_architect`):** Diseño de arquitectura, volumetría, consumo de red y Definition of Done (DoD).
3. **Clean Code Lead Developer (`lead_developer`):** Implementación atómica, SOLID, DRY y Cláusulas de Guarda (Early Returns).
4. **Branch & GitFlow Guardian (`branch_manager`):** Gestión de ramas, GitFlow, Trunk-based, pull requests y resolución de conflictos.
5. **QA Lead Sentinel (`qa_lead`):** Pirámide de pruebas automatizadas, 100% cobertura de líneas/ramas y salud de compilación.
6. **AppSec & Compliance Sentinel (`appsec_lead`):** Auditoría de seguridad OWASP Top 10, sanitización y prevención de fuga de credenciales.
7. **R&D Innovation Sentinel (`rnd_lead`):** Spikes técnicos, evaluación de nuevas tecnologías y análisis forense de bugs complejos.
8. **Version Bump Guardian (`release_guardian`):** SemVer, sincronización de artefactos y tags de release.

---

## 🚀 Instalación y Requisitos

1. Tener **Ollama** corriendo localmente (`http://localhost:11434`):
   ```bash
   ollama pull qwen2.5-coder:latest
   ollama pull gemma4:e2b
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```

---

## 💻 Uso

### 1. Ejecutar Demostración Rápida
Prueba agentes individuales (Branch Manager & R&D Lead) ejecutando tareas en Ollama:
```bash
npm run demo
```

### 2. Flujo Completo Interactivo (Pipeline de Feature)
Pasa un requerimiento para que el Product Owner, Arquitecto, Developer y QA trabajen en secuencia:
```bash
npm start
```
