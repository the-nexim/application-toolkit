import {existsSync} from 'fs';
import {readFile, writeFile, mkdir, readdir} from 'fs/promises';
import {join} from 'node:path';
import {env} from 'process';

import cssnano from 'cssnano';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import postcssPresetEnv from 'postcss-preset-env';
import postcssVariableCompress from 'postcss-variable-compress';
import postcssViewportUnitFallback from 'postcss-viewport-unit-fallback';
import tailwindcss from 'tailwindcss';
import postcssNesting from 'tailwindcss/nesting/index.js';

import {logger} from './logger.mjs';

const basePath = 'style';

const postCssPlugins = [postcssImport({root: basePath}), postcssNesting, tailwindcss, postcssViewportUnitFallback, postcssPresetEnv];

if (env.NODE_ENV === 'production') {
  postCssPlugins.push(
    postcssVariableCompress,
    cssnano({
      preset: ['default', {discardComments: {removeAll: true}}],
    }),
  );
}

const postCss = postcss(postCssPlugins);

export async function postcssBuild() {
  logger.logMethod?.('postcssBuild');
  const inputDir = basePath;
  const outputDir = 'dist/css/';
  const startTime = Date.now();

  if (!existsSync(outputDir)) {
    await mkdir(outputDir, {recursive: true});
  }

  const dirFileList = await readdir(inputDir);

  for (const fileName of dirFileList) {
    if (!fileName.endsWith('.css')) {
      continue;
    }

    const inputFilePath = join(inputDir, fileName);
    const outputFilePath = join(outputDir, fileName);

    let outputContent = '';

    try {
      const fileContent = await readFile(inputFilePath, 'utf8');
      outputContent = (await postCss.process(fileContent, {from: inputFilePath, to: outputFilePath})).css;
    }
    catch (err) {
      console.error(err);
      outputContent = `
        html {
          background-color: #a11;
        }

        html:after {
          content: 'Postcss error!';
          display: block;
          margin-top: 2rem;
          font-size: 1.3rem;
          text-align: center;
        }

        body {
          display: none !important;
        }
      `;
    }

    await writeFile(outputFilePath, outputContent, {encoding: 'utf8'});

    const size = (new Blob([outputContent]).size / 1024).toFixed(1);
    logger.logOther?.(`📦 ${outputFilePath} ${size}kb`);
  }

  const endTime = Date.now();
  console.log(`⚡\u001b[32m Done in ${endTime - startTime}ms\u001b[0m`);
}
