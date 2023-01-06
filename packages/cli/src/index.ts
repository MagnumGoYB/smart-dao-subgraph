import glob from 'glob'
import handlebars from 'handlebars'
import fs from 'node:fs'
import path from 'node:path'
import yargs from 'yargs'

import { Configurator, Context, Contexts, Environment, ManifestValues } from './types'
import { formatJson, sourceDeclaration } from './utils'

const graph = require('@graphprotocol/graph-cli/src/cli').run as (args?: string[]) => Promise<void>
const root = path.join(__dirname, '..')

class SubgraphLoader<TVariables = any> {
  public readonly contexts: Contexts<TVariables>
  protected readonly configure: Configurator<TVariables>

  constructor(public readonly root: string) {
    const config = require(path.join(root, 'subgraph.config.ts'))

    this.contexts = config.contexts
    this.configure = config.configure
  }

  public load(ctx: string) {
    const context: Context<TVariables> = this.contexts[ctx]

    if (context == null) {
      throw new Error(
        `Invalid context ${context}. Available contexts: ${Object.keys(this.contexts).join(', ')}`
      )
    }

    const configuration = this.configure(context.variables)

    const manifest: ManifestValues = {
      network: context.network,
      sources: []
    }

    manifest.network = context.network
    manifest.sources = configuration.sources
      .map((item) => sourceDeclaration(item, this.root))
      .filter((item) => item.address !== '0x0000000000000000000000000000000000000000')

    const environment: Environment<TVariables> = {
      name: context.name,
      network: context.network,
      local: context.local ? true : false,
      variables: context.variables,
      manifest
    }

    return new Subgraph(environment, this.root)
  }
}

class Subgraph<TVariables = any> {
  constructor(public readonly environment: Environment<TVariables>, public readonly root: string) {}

  public async generateManifest() {
    const templateFile = path.join(root, 'templates/subgraph.template.yaml')
    const outputFile = path.join(this.root, 'subgraph.yaml')
    const templateContent = fs.readFileSync(templateFile, 'utf8')

    const compile = handlebars.compile(templateContent)
    const replaced = compile(this.environment.manifest)

    fs.writeFileSync(outputFile, replaced)
  }

  public async generateAbis() {
    this.environment.manifest.sources.forEach((source) => {
      const formattedFragments = source.events.map((event) => formatJson(event.fragment))
      const jsonOutput = JSON.stringify(formattedFragments, undefined, 2)
      const outputFile = path.join(this.root, source.abi.file)
      const outputDir = path.dirname(outputFile)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      fs.writeFileSync(outputFile, jsonOutput)
    })
  }

  public async generateCode() {
    const generatedDir = path.join(this.root, 'generated')
    const outputDir = path.join(generatedDir, 'contracts')
    await graph(['codegen', '--skip-migrations', 'true', '--output-dir', outputDir])

    fs.renameSync(path.join(outputDir, 'schema.ts'), path.join(generatedDir, 'schema.ts'))

    const globbed = glob.sync('**/*', { cwd: outputDir, absolute: true })
    const files = globbed.filter((item) => fs.statSync(item).isFile())
    const directories = globbed
      .filter((item) => fs.statSync(item).isDirectory())
      .filter(
        (outer, _, array) => !array.some((inner) => inner !== outer && outer.startsWith(inner))
      )

    files.forEach((item) => fs.renameSync(item, path.join(outputDir, path.basename(item))))
    directories.forEach((item) => fs.rmSync(item, { recursive: true }))
  }

  public async deploySubgraph() {
    await graph([
      'deploy',
      this.environment.name,
      '--skip-migrations',
      'true',
      '--output-dir',
      path.join(this.root, 'build/subgraph')
    ])
  }

  public async buildSubgraph() {
    await graph([
      'build',
      '--skip-migrations',
      'true',
      '--output-dir',
      path.join(this.root, 'build/subgraph')
    ])
  }

  public async createSubgraph() {
    if (!this.environment.local) {
      return
    }

    await graph(['create', this.environment.name])
  }
}

interface Args {
  subgraph: Subgraph
}

yargs
  .env('SMART_DAO_SUBGRAPH')
  .option('cwd', {
    type: 'string',
    description: 'The working directory',
    default: process.cwd()
  })
  .positional('context', {
    type: 'string',
    description: 'The configuration context (e.g. network name).'
  })
  .demandOption(['cwd', 'context'])
  .middleware((args) => {
    const builder = new SubgraphLoader(args.cwd)
    const contexts = Object.keys(builder.contexts)

    if (!contexts.length) {
      console.error('No available contexts.')
      process.exit(1)
    }

    if (!contexts.includes(args.context)) {
      console.error(
        `Invalid context "${args.context}". Available contexts: "${contexts.join('", "')}"`
      )
      process.exit(1)
    }

    const subgraph = builder.load(args.context)
    args.subgraph = subgraph
  })
  .command<Args>(
    'codegen <context>',
    'Generate the subgraph manifest and code.',
    () => {},
    async ({ subgraph }) => {
      console.log('Generating event abis')
      await subgraph.generateAbis()

      console.log('Generating subgraph manifest')
      await subgraph.generateManifest()

      console.log('Generating code')
      await subgraph.generateCode()
    }
  )
  .command<Args>(
    'build <context>',
    'Compile the subgraph code into the wasm runtimes.',
    () => {},
    async ({ subgraph }) => {
      console.log('Generating code')
      await subgraph.buildSubgraph()
    }
  )
  .command<Args>(
    'deploy <context>',
    'Deploy the subgraph.',
    () => {},
    async ({ subgraph }) => {
      console.log('Generating event abis')
      await subgraph.generateAbis()

      console.log('Generating subgraph manifest')
      await subgraph.generateManifest()

      console.log('Generating code')
      await subgraph.generateCode()

      console.log('Deploying subgraph')
      await subgraph.createSubgraph()
      await subgraph.deploySubgraph()
    }
  )
  .demandCommand()
  .help().argv
