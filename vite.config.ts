import { defineConfig } from 'vite';

// GitHub Pages는 /저장소이름/ 아래에서 열리므로 에셋 경로를 상대 경로로 둔다.
export default defineConfig({ base: './' });
