import Anthropic from "@anthropic-ai/sdk";

export class AppelClaudeEchoue extends Error {}

function estTransitoire(e: unknown): boolean {
  return (
    e instanceof Anthropic.RateLimitError ||
    e instanceof Anthropic.APIConnectionError ||
    e instanceof Anthropic.APITimeoutError ||
    e instanceof Anthropic.InternalServerError
  );
}

let clientCache: { apiKey: string; client: Anthropic } | null = null;

function getClient(apiKey: string): Anthropic {
  if (!clientCache || clientCache.apiKey !== apiKey) {
    clientCache = { apiKey, client: new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) };
  }
  return clientCache.client;
}

export async function appelClaude(
  apiKey: string,
  model: string,
  messages: Anthropic.MessageParam[],
  maxTokens = 1024,
  maxEssais = 3
): Promise<string> {
  const client = getClient(apiKey);

  let delai = 1000;
  for (let essai = 1; essai <= maxEssais; essai++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages,
      });
      const block = response.content[0];
      if (block.type !== "text") throw new AppelClaudeEchoue("Réponse non-texte inattendue");
      return block.text;
    } catch (e) {
      if (estTransitoire(e)) {
        if (essai === maxEssais) {
          throw new AppelClaudeEchoue(`Échec après ${maxEssais} essais : ${e}`);
        }
        await new Promise((r) => window.setTimeout(r, delai));
        delai *= 2;
      } else {
        throw e;
      }
    }
  }
  throw new AppelClaudeEchoue("Échec inattendu");
}
