# 🛡️ Política de Seguridad y Adopción de MCPs Oficiales y SDKs Certificados

**Proyecto:** Agile Squad Company  
**Versión:** 1.0.0  
**Fecha:** 2026-09-06  
**Autor:** Agile AI Dev Squad & Security / AppSec Sentinel  

---

## 1. 🎯 Principio Rector: Cero Dependencias No Verificadas
Para proteger los entornos de desarrollo, código fuente, secretos empresariales y credenciales corporativas, **Agile Squad Company prohíbe terminantemente la instalación o descarga de paquetes comunitarios no oficiales o de terceros desconocidos** para la comunicación con herramientas de infraestructura y servicios cloud.

Toda integración de herramientas (Tools / MCP) debe pertenecer estrictamente a una de estas dos categorías autorizadas:
1. **Servidores MCP Oficiales Certificados:** Publicados y mantenidos por el equipo creador de la especificación MCP y Anthropic bajo el namespace `@modelcontextprotocol/*`.
2. **Adaptadores Propios sobre SDKs Oficiales de Fabricantes:** Clientes creados internamente sobre librerías oficiales de Microsoft (`microsoft1es`), Atlassian o Git nativo.

---

## 2. 📋 Matriz de Arquitectura y Tecnologías Homologadas

| Dominio | Servicio | Enfoque Tecnológico Homologado | Paquete / SDK Oficial Autorizado | Proveedor / Mantenedor Oficial |
| :--- | :--- | :--- | :--- | :--- |
| **Acceso a Archivos** | Disco Local Workspace | Servidor MCP Certificado | `@modelcontextprotocol/server-filesystem` | Anthropic / MCP Core Team |
| **Control de Versiones Cloud** | GitHub | Servidor MCP Certificado | `@modelcontextprotocol/server-github` | Anthropic / MCP Core Team |
| **Bases de Datos** | PostgreSQL | Servidor MCP Certificado | `@modelcontextprotocol/server-postgres` | Anthropic / MCP Core Team |
| **Investigación & R&D** | Búsqueda en la Red | Servidor MCP Certificado | `@modelcontextprotocol/server-brave-search` | Anthropic / MCP Core Team |
| **Documentación Web** | Web Fetch / Scraping | Servidor MCP Certificado | `@modelcontextprotocol/server-fetch` | Anthropic / MCP Core Team |
| **Control de Versiones Local** | Git en Máquina | Binario Local Seguro | Binario oficial `git` CLI ejecutado en subprocess aislado | Git SCM |
| **Gestión Ágil & CI/CD** | Azure DevOps | Adaptador Nativo Interno | `azure-devops-node-api` | Microsoft (`microsoft1es`) |
| **Gestión de Tickets** | Jira Cloud | Adaptador Nativo Interno | Atlassian REST API v3 (Fetch nativo de Node.js con Auth Basic/Bearer) | Atlassian Oficial |
| **Protocolo de Conexión** | Runtime MCP Client | SDK Oficial de MCP | `@modelcontextprotocol/sdk` | Anthropic / MCP Core Team |

---

## 3. 🏗️ Diseño de Adaptadores Propios (Azure DevOps & Jira)

En lugar de delegar el acceso a tableros y repositorios corporativos a paquetes de terceros no auditados, implementamos adaptadores en TypeScript puro dentro de `src/adapters/`:

### A. Adaptador Azure DevOps (`AzureDevOpsAdapter.ts`)
* Utiliza el paquete oficial de Microsoft **`azure-devops-node-api`**.
* Autenticación mediante **PAT (Personal Access Token)** inyectado como variable de entorno `AZURE_DEVOPS_PAT`.
* Expone de forma limpia al Squad las funciones:
  - `getWorkItem(id: number)`: Obtiene título, descripción y criterios de aceptación.
  - `updateWorkItemStatus(id: number, state: string)`: Actualiza el estado en Azure Boards (`Active`, `Resolved`, `Closed`).
  - `createPullRequest(sourceBranch, targetBranch, title, description)`: Crea PRs en Azure Repos vinculadas al Work Item.

### B. Adaptador Jira Cloud (`JiraCloudAdapter.ts`)
* Utiliza llamadas HTTPS directas a la **API REST v3 oficial de Atlassian** mediante el `fetch` nativo de Node.js 18+.
* Autenticación con `JIRA_EMAIL` y `JIRA_API_TOKEN` en encabezado `Authorization: Basic`.
* Expone de forma limpia al Squad las funciones:
  - `getIssue(issueKey: string)`: Lee historias de usuario, épicas o bugs.
  - `transitionIssue(issueKey: string, transitionName: string)`: Transiciona el ticket en el tablero ágil (`In Progress`, `In Review`, `Done`).
  - `addComment(issueKey: string, comment: string)`: Publica el resumen de cambios técnicos, resultados de QA y enlaces a ramas.

---

## 4. 🔒 Protocolo de Seguridad y Manejo de Secretos

1. **Aislamiento de Entorno (.env):**
   - Todos los tokens (`AZURE_DEVOPS_PAT`, `JIRA_API_TOKEN`, `GITHUB_PERSONAL_ACCESS_TOKEN`, `BRAVE_API_KEY`) deben residir en un archivo `.env` local.
   - El archivo `.env` está expresamente excluido de Git en `.gitignore`. Se provee únicamente un `.env.example` sin valores sensibles.
2. **Modo Read-Only por Defecto en Base de Datos:**
   - Todo servidor de bases de datos MCP conectado al agente de backend opera con usuario de solo lectura para análisis de esquemas y generación de DTOs, prohibiendo `DROP`, `DELETE` o `UPDATE` automáticos.
3. **Restricción de Directorios (Sandboxing):**
   - `@modelcontextprotocol/server-filesystem` solo recibe permiso explícito sobre la ruta absoluta del repositorio en curso (`c:\Users\crisr\git\agile-squad-company` o la carpeta del proyecto a desarrollar). Se prohíbe montar el directorio raíz del usuario o del sistema operativo.
