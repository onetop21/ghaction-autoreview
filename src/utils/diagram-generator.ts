import * as core from '@actions/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Mermaid 다이어그램 생성 및 PNG 변환
 */
export class DiagramGenerator {
  /**
   * Mermaid 코드를 추출하여 PNG로 변환
   */
  async convertMermaidToPng(markdownContent: string, outputDir: string): Promise<string[]> {
    core.info('[DiagramGenerator] Extracting Mermaid diagrams...');

    const mermaidBlocks = this.extractMermaidBlocks(markdownContent);
    if (mermaidBlocks.length === 0) {
      core.info('[DiagramGenerator] No Mermaid diagrams found');
      return [];
    }

    const pngPaths: string[] = [];

    for (let i = 0; i < mermaidBlocks.length; i++) {
      try {
        const mermaidCode = mermaidBlocks[i];
        const pngPath = await this.convertSingleDiagram(mermaidCode, outputDir, i);
        pngPaths.push(pngPath);
      } catch (error) {
        core.warning(`[DiagramGenerator] Failed to convert diagram ${i}: ${error}`);
      }
    }

    return pngPaths;
  }

  /**
   * 마크다운에서 Mermaid 코드 블록 추출
   */
  private extractMermaidBlocks(markdown: string): string[] {
    const regex = /```mermaid\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match;

    while ((match = regex.exec(markdown)) !== null) {
      blocks.push(match[1].trim());
    }

    return blocks;
  }

  /**
   * 단일 Mermaid 다이어그램을 PNG로 변환
   */
  private async convertSingleDiagram(mermaidCode: string, outputDir: string, index: number): Promise<string> {
    // 임시 Mermaid 파일 생성
    const mmdPath = path.join(outputDir, `diagram-${index}.mmd`);
    const pngPath = path.join(outputDir, `diagram-${index}.png`);

    await fs.writeFile(mmdPath, mermaidCode, 'utf-8');

    try {
      // mmdc (Mermaid CLI) 사용하여 PNG 변환
      await execAsync(`npx -y @mermaid-js/mermaid-cli mmdc -i "${mmdPath}" -o "${pngPath}"`);

      core.info(`[DiagramGenerator] Converted diagram ${index} to PNG`);

      // 임시 파일 삭제
      await fs.unlink(mmdPath);

      return pngPath;
    } catch (error) {
      core.warning(`[DiagramGenerator] mmdc not available, keeping Mermaid code in markdown`);
      // 변환 실패 시 원본 Mermaid 코드 유지
      await fs.unlink(mmdPath).catch(() => {});
      throw error;
    }
  }

  /**
   * 마크다운에 PNG 이미지 임베드
   */
  embedPngInMarkdown(markdown: string, pngPaths: string[]): string {
    let result = markdown;
    const mermaidBlocks = this.extractMermaidBlocks(markdown);

    for (let i = 0; i < mermaidBlocks.length && i < pngPaths.length; i++) {
      const mermaidBlock = `\`\`\`mermaid\n${mermaidBlocks[i]}\n\`\`\``;
      const imageEmbed = `![Diagram ${i + 1}](${pngPaths[i]})\n\n<details>\n<summary>Mermaid 소스 코드</summary>\n\n${mermaidBlock}\n\n</details>`;

      result = result.replace(mermaidBlock, imageEmbed);
    }

    return result;
  }
}

export const diagramGenerator = new DiagramGenerator();
