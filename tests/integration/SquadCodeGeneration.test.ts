import * as fs from 'fs';
import * as path from 'path';
import { CompanyOrchestrator } from '../../src/CompanyOrchestrator';
import ollama from 'ollama';

jest.mock('ollama');

describe('Squad Code Generation & Architecture Validations (Node.js, Python, Go, Rust)', () => {
  const baseTestDir = path.resolve(__dirname, '../../../agile-squad-test');
  const nodeTestDir = path.join(baseTestDir, 'agile-test-node');
  const pythonTestDir = path.join(baseTestDir, 'agile-test-python');
  const goTestDir = path.join(baseTestDir, 'agile-test-go');
  const rustTestDir = path.join(baseTestDir, 'agile-test-rust');

  beforeAll(() => {
    const cleanDir = (dir: string) => {
      if (fs.existsSync(dir)) {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      }
    };
    [nodeTestDir, pythonTestDir, goTestDir, rustTestDir].forEach(dir => {
      cleanDir(dir);
      fs.mkdirSync(dir, { recursive: true });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Files are preserved in agile-squad-test directories for physical inspection
  });

  describe('Node.js Code Generation & Architecture Report', () => {
    it('should generate ARCHITECTURE.md and core Node.js files physically in agile-test-node', async () => {
      const company = new CompanyOrchestrator({
        workspaceRoot: nodeTestDir,
        enableMcpTools: true
      });

      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'I+D Spike: Recomendado Node.js con TypeScript, Express, Jest y ESLint flat config.'
        }
      });

      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'User Story: Task API con endpoints CRUD (GET /tasks, POST /tasks) y validacion.'
        }
      });

      (ollama.chat as jest.Mock)
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            tool_calls: [
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'ARCHITECTURE.md',
                    content: '# Arquitectura Node.js\n\n## 1. Estructura del Proyecto\n- src/\n- tests/\n\n## 2. Contratos de Interfaz\nGET /tasks\n\n## 3. Definition of Done\nEarly returns.'
                  }
                }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            content: 'Arquitectura definida y archivo ARCHITECTURE.md creado exitosamente.'
          }
        });

      (ollama.chat as jest.Mock)
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            tool_calls: [
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'package.json',
                    content: JSON.stringify(
                      {
                        name: 'task-api-node',
                        version: '1.0.0',
                        scripts: { build: 'tsc', start: 'node dist/index.js', test: 'jest' },
                        dependencies: { express: '^4.19.0' },
                        devDependencies: { typescript: '^5.0.0', '@types/express': '^4.17.0' }
                      },
                      null,
                      2
                    )
                  }
                }
              },
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'tsconfig.json',
                    content: JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'commonjs', strict: true } }, null, 2)
                  }
                }
              },
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'src/index.ts',
                    content: 'import express from "express";\nexport const app = express();\napp.get("/tasks", (req, res) => res.json([]));\n'
                  }
                }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          message: { role: 'assistant', content: 'Backend files written.' }
        });

      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'No frontend UI required.' }
      });

      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Integration verified.' }
      });

      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'QA Suite approved.' }
      });

      const results = await company.runParallelDevPipeline('Crea una API REST de Tareas en Node.js con TypeScript');

      expect(results['2_tech_architect']).toBeDefined();

      const archPath = path.join(nodeTestDir, 'ARCHITECTURE.md');
      const pkgPath = path.join(nodeTestDir, 'package.json');
      const tsconfigPath = path.join(nodeTestDir, 'tsconfig.json');
      const indexPath = path.join(nodeTestDir, 'src', 'index.ts');

      expect(fs.existsSync(archPath)).toBe(true);
      expect(fs.existsSync(pkgPath)).toBe(true);
      expect(fs.existsSync(tsconfigPath)).toBe(true);
      expect(fs.existsSync(indexPath)).toBe(true);

      const archContent = fs.readFileSync(archPath, 'utf-8');
      expect(archContent).toContain('Estructura del Proyecto');
      expect(archContent).toContain('Contratos de Interfaz');
      expect(archContent).toContain('Definition of Done');

      await company.dispose();
      const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(pkgJson.name).toBe('task-api-node');
      expect(pkgJson.dependencies['react-scripts']).toBeUndefined();
      expect(pkgJson.devDependencies['tslint']).toBeUndefined();
    });
  });

  describe('Python Code Generation & Architecture Report', () => {
    it('should generate ARCHITECTURE.md and core Python files physically in agile-test-python', async () => {
      const company = new CompanyOrchestrator({
        workspaceRoot: pythonTestDir,
        enableMcpTools: true
      });

      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'I+D Spike: Recomendado Python 3.11 con FastAPI, Pydantic v2 y PyTest.'
        }
      });

      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'User Story: Servicio de metricas en Python con FastAPI.'
        }
      });

      (ollama.chat as jest.Mock)
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            tool_calls: [
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'ARCHITECTURE.md',
                    content: '# Arquitectura Python\n\n## 1. Estructura de Directorios y Carpetas\n- app/\n- tests/\n\n## 2. Contratos y Validacion\nPOST /calculate\n\n## 3. Definition of Done\nPyTest.'
                  }
                }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            content: 'ARCHITECTURE.md para Python guardado exitosamente.'
          }
        });

      (ollama.chat as jest.Mock)
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            tool_calls: [
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'pyproject.toml',
                    content: '[project]\nname = "metrics-service"\nversion = "0.1.0"\ndependencies = ["fastapi>=0.110.0"]\n'
                  }
                }
              },
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'app/main.py',
                    content: 'from fastapi import FastAPI\napp = FastAPI()\n@app.get("/health")\ndef health(): return {"status": "ok"}\n'
                  }
                }
              },
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'tests/test_main.py',
                    content: 'def test_health(): assert True\n'
                  }
                }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          message: { role: 'assistant', content: 'Python source and test files generated.' }
        });

      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'No UI required.' }
      });

      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Python modules integrated cleanly.' }
      });

      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'QA certification completed.' }
      });

      const results = await company.runParallelDevPipeline('Crea un microservicio en Python con FastAPI');

      expect(results['2_tech_architect']).toBeDefined();

      const archPath = path.join(pythonTestDir, 'ARCHITECTURE.md');
      const pyprojectPath = path.join(pythonTestDir, 'pyproject.toml');
      const mainPyPath = path.join(pythonTestDir, 'app', 'main.py');
      const testPyPath = path.join(pythonTestDir, 'tests', 'test_main.py');

      expect(fs.existsSync(archPath)).toBe(true);
      expect(fs.existsSync(pyprojectPath)).toBe(true);
      expect(fs.existsSync(mainPyPath)).toBe(true);
      expect(fs.existsSync(testPyPath)).toBe(true);

      const archContent = fs.readFileSync(archPath, 'utf-8');
      expect(archContent).toContain('Estructura de Directorios y Carpetas');
      expect(archContent).toContain('Definition of Done');

      const pyprojectContent = fs.readFileSync(pyprojectPath, 'utf-8');
      expect(pyprojectContent).toContain('fastapi');
      expect(pyprojectContent).not.toContain('distutils');

      await company.dispose();
    });
  });

  describe('Go Code Generation & Architecture Report', () => {
    it('should generate ARCHITECTURE.md and core Go files physically in agile-test-go', async () => {
      const company = new CompanyOrchestrator({
        workspaceRoot: goTestDir,
        enableMcpTools: true
      });

      // 0. R&D
      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'I+D Spike: Recomendado Go 1.22+ con Gin Gonic o net/http estándar, clean architecture y tests con testing nativo.'
        }
      });

      // 1. PO
      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'User Story: Servicio de Pagos en Go con endpoint POST /v1/payments y validación temprana.'
        }
      });

      // 2. ARCHITECT: writes ARCHITECTURE.md
      (ollama.chat as jest.Mock)
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            tool_calls: [
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'ARCHITECTURE.md',
                    content: '# Arquitectura Go\n\n## 1. Estructura de Directorios y Paquetes\n- cmd/server/main.go\n- pkg/payment/\n- internal/\n\n## 2. Contratos de API\nPOST /v1/payments\n\n## 3. Definition of Done\nEarly returns con guard clauses y pruebas de cobertura `go test -v ./...`.'
                  }
                }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            content: 'ARCHITECTURE.md para Go guardado exitosamente.'
          }
        });

      // 3. BACKEND DEV: writes go.mod, cmd/server/main.go, pkg/payment/service.go
      (ollama.chat as jest.Mock)
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            tool_calls: [
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'go.mod',
                    content: 'module payment-service\n\ngo 1.22\n'
                  }
                }
              },
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'cmd/server/main.go',
                    content: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Payment service running on port 8080")\n}\n'
                  }
                }
              },
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'pkg/payment/service_test.go',
                    content: 'package payment\n\nimport "testing"\n\nfunc TestProcessPayment(t *testing.T) {\n\tif false {\n\t\tt.Errorf("failed")\n\t}\n}\n'
                  }
                }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          message: { role: 'assistant', content: 'Go module and source files written.' }
        });

      // Frontend Dev: No UI required
      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'No UI required for backend payment microservice.' }
      });

      // Repo Integrator
      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Go module contracts verified.' }
      });

      // QA Lead
      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'QA Suite approved for Go service.' }
      });

      const results = await company.runParallelDevPipeline('Crea un microservicio de pagos en Go');

      expect(results['2_tech_architect']).toBeDefined();

      const archPath = path.join(goTestDir, 'ARCHITECTURE.md');
      const goModPath = path.join(goTestDir, 'go.mod');
      const mainGoPath = path.join(goTestDir, 'cmd', 'server', 'main.go');
      const testGoPath = path.join(goTestDir, 'pkg', 'payment', 'service_test.go');

      expect(fs.existsSync(archPath)).toBe(true);
      expect(fs.existsSync(goModPath)).toBe(true);
      expect(fs.existsSync(mainGoPath)).toBe(true);
      expect(fs.existsSync(testGoPath)).toBe(true);

      const archContent = fs.readFileSync(archPath, 'utf-8');
      expect(archContent).toContain('Estructura de Directorios y Paquetes');
      expect(archContent).toContain('Definition of Done');

      const modContent = fs.readFileSync(goModPath, 'utf-8');
      expect(modContent).toContain('module payment-service');

      await company.dispose();
    });
  });

  describe('Rust Code Generation & Architecture Report', () => {
    it('should generate ARCHITECTURE.md and core Rust files physically in agile-test-rust', async () => {
      const company = new CompanyOrchestrator({
        workspaceRoot: rustTestDir,
        enableMcpTools: true
      });

      // 0. R&D
      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'I+D Spike: Recomendado Rust moderno con Cargo, Axum o Actix-web, serde para JSON y Tokio runtime.'
        }
      });

      // 1. PO
      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'User Story: Servicio de Telemetría en Rust de ultra baja latencia con endpoint /telemetry.'
        }
      });

      // 2. ARCHITECT: writes ARCHITECTURE.md
      (ollama.chat as jest.Mock)
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            tool_calls: [
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'ARCHITECTURE.md',
                    content: '# Arquitectura Rust\n\n## 1. Organización del Workspace y Crate\n- src/main.rs\n- src/lib.rs\n- tests/\n\n## 2. Contratos y Tipos\nTelemetryPayload con Serde.\n\n## 3. Definition of Done\n`cargo clippy` y `cargo test`.'
                  }
                }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            content: 'ARCHITECTURE.md para Rust creado exitosamente.'
          }
        });

      // 3. BACKEND DEV: writes Cargo.toml, src/main.rs, tests/integration_test.rs
      (ollama.chat as jest.Mock)
        .mockResolvedValueOnce({
          message: {
            role: 'assistant',
            tool_calls: [
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'Cargo.toml',
                    content: '[package]\nname = "telemetry-service"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\ntokio = { version = "1.0", features = ["full"] }\n'
                  }
                }
              },
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'src/main.rs',
                    content: '#[tokio::main]\nasync func main() {\n    println!("Telemetry server started");\n}\n'
                  }
                }
              },
              {
                function: {
                  name: 'write_file',
                  arguments: {
                    path: 'tests/integration_test.rs',
                    content: '#[test]\nfn test_telemetry() {\n    assert!(true);\n}\n'
                  }
                }
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          message: { role: 'assistant', content: 'Rust crate manifest and source code written.' }
        });

      // Frontend Dev: No UI required
      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'No UI required.' }
      });

      // Repo Integrator
      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Cargo workspace contracts validated.' }
      });

      // QA Lead
      (ollama.chat as jest.Mock).mockResolvedValueOnce({
        message: { role: 'assistant', content: 'QA certification completed for Rust crate.' }
      });

      const results = await company.runParallelDevPipeline('Crea un servicio de telemetria en Rust');

      expect(results['2_tech_architect']).toBeDefined();

      const archPath = path.join(rustTestDir, 'ARCHITECTURE.md');
      const cargoPath = path.join(rustTestDir, 'Cargo.toml');
      const mainRsPath = path.join(rustTestDir, 'src', 'main.rs');
      const testRsPath = path.join(rustTestDir, 'tests', 'integration_test.rs');

      expect(fs.existsSync(archPath)).toBe(true);
      expect(fs.existsSync(cargoPath)).toBe(true);
      expect(fs.existsSync(mainRsPath)).toBe(true);
      expect(fs.existsSync(testRsPath)).toBe(true);

      const archContent = fs.readFileSync(archPath, 'utf-8');
      expect(archContent).toContain('Organización del Workspace');
      expect(archContent).toContain('Definition of Done');

      const cargoContent = fs.readFileSync(cargoPath, 'utf-8');
      expect(cargoContent).toContain('telemetry-service');

      await company.dispose();
    });
  });
});
