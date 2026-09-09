export interface AgentRoleConfig {
  roleId: string;
  name: string;
  defaultModel: string;
  provider?: 'ollama' | 'gemini';
  requiredSkills: string[];
  systemPromptBase: string;
}

export interface CompanyTask {
  id: string;
  title: string;
  description: string;
  context?: Record<string, any>;
}

export interface AgentExecutionResult {
  roleId: string;
  agentName: string;
  modelUsed: string;
  success: boolean;
  output: string;
  timestamp: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class WebSearchTool {
  public static async searchDuckDuckGo(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    try {
      const targetUrl = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!res.ok) {
        throw new Error(`DuckDuckGo HTTP status ${res.status}`);
      }

      const html = await res.text();
      const results: SearchResult[] = [];
      const resultBlocks = html.split(/class=["'][^"']*results_links_deep[^"']*["']/);

      for (let i = 1; i < resultBlocks.length && results.length < maxResults; i++) {
        const block = resultBlocks[i];
        const linkMatch = block.match(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/) ||
                          block.match(/<a[^>]+href=["']([^"']+)["'][^>]+class=["'][^"']*result__a[^"']*["'][^>]*>([\s\S]*?)<\/a>/);
        const snippetMatch = block.match(/<a[^>]+class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/);

        const title = linkMatch ? linkMatch[2].replace(/<[^>]+>/g, '').trim() : 'Sin titulo';
        let url = linkMatch ? linkMatch[1] : '';

        if (url.includes('uddg=')) {
          const parts = url.split('uddg=')[1].split('&');
          try {
            url = decodeURIComponent(parts[0]);
          } catch {
            // Keep original
          }
        }

        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        if (title && url) {
          results.push({ title, url, snippet });
        }
      }

      return results;
    } catch (error) {
      console.warn('⚠️ [WebSearchTool] Error searching DuckDuckGo:', (error as Error).message);
      return [];
    }
  }
}
