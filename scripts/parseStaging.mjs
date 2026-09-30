import fs from 'fs';
import path from 'path';

const content = fs.readFileSync('docs/STAGING_LIST.md', 'utf-8');
const sections = content.split(/^##\s+/m).slice(1);

console.log(`Encontradas ${sections.length} seções.`);

const products = [];

for (const section of sections) {
  const lines = section.trim().split('\n');
  const header = lines[0]; // e.g. "0. Óculos Sem Armação Flame Y2K com Cristais — SHEIN"
  const matchHeader = header.match(/^(\d+)\.\s*(.*?)(?:\s*—\s*(.*))?$/);
  if (!matchHeader) continue;

  const itemIndex = parseInt(matchHeader[1], 10);
  const rawName = matchHeader[2].trim();
  const brand = (matchHeader[3] || 'SHEIN').trim();

  // Extract link
  const linkMatch = section.match(/\[(?:Ver na SHEIN|Link)\]\((https:\/\/[^\s\)]+)\)/i);
  const url = linkMatch ? linkMatch[1] : '';

  // Extract category and subcategory
  const catMatch = section.match(/\(`([a-z0-9-]+)`\s*(?:\/\s*`([a-z0-9-]+)`)?\)/i);
  const category = catMatch ? catMatch[1] : 'moda';
  const subcategory = catMatch && catMatch[2] ? catMatch[2] : 'acessorios';

  // Extract collection
  const colMatch = section.match(/\*\*(?:Coleção|Ambiente):\*\*\s*(.+)/i);
  const collection = colMatch ? colMatch[1].trim() : 'Estilo & Acessórios';

  // Extract icon
  const iconMatch = section.match(/Ícone \/ Visual:\*\*\s*([^\n\r]+)/i);
  const icon = iconMatch ? iconMatch[1].trim() : '✨';

  console.log(`[${itemIndex}] ${rawName} | Cat: ${category}/${subcategory} | Col: ${collection} | Url: ${url ? 'OK' : 'MISSING'}`);
}
