import { JsonFragment, JsonFragmentType } from '@ethersproject/abi'
import { utils } from 'ethers'
import fs from 'node:fs'
import path from 'node:path'

import type {
  DataSourceDeclaration,
  DataSourceUserDeclaration,
  EventHandlerDeclaration,
  EventHandlerUserDeclaration
} from './types'
import { AbiDeclarationType } from './types'

type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

export function formatJson(fragment: utils.Fragment) {
  const json = JSON.parse(fragment.format(utils.FormatTypes.json))
  return sanitizeFragmentJson(json as Mutable<JsonFragment>)
}

function sanitizeParamJson(param: Mutable<JsonFragmentType>, parent: string) {
  param.name = param.name ?? ''
  if (param.components) {
    param.internalType =
      param.internalType ?? `struct ${parent.charAt(0).toUpperCase()}${parent.slice(1)}Output`
    param.components = param.components.map((component, index) =>
      sanitizeParamJson(component, `${parent}${index}`)
    )
  } else {
    param.internalType = param.internalType ?? param.type
  }

  return param
}

function sanitizeFragmentJson(fragment: Mutable<JsonFragment>) {
  const name = (fragment.name = fragment.name ?? '')
  if (fragment.inputs) {
    fragment.inputs = fragment.inputs.map((input) => sanitizeParamJson(input, name))
  }

  if (fragment.outputs) {
    fragment.outputs = fragment.outputs.map((output) => sanitizeParamJson(output, name))
  }

  return fragment
}

function formatParams(params: utils.ParamType[]) {
  return params.map((param) => `${param.indexed ? 'indexed ' : ''}${param.type}`).join(',')
}

export function eventDeclaration(input: EventHandlerUserDeclaration): EventHandlerDeclaration {
  const fragment = typeof input === 'string' ? utils.EventFragment.fromString(input) : input
  const handler = `handle${fragment.name}`
  const output = `${fragment.name}(${formatParams(fragment.inputs)})`

  return { event: output, fragment, handler }
}

function resolveUserDefinedPath(input: string, root: string): string {
  try {
    const absolutePath = input.startsWith('/') ? input : path.join(root, input)
    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
      return absolutePath
    }

    return require.resolve(input)
  } catch (e) {
    throw new Error(`Failed to resolve user-defined path ${input} at ${root}.`)
  }
}

function loadAbiAtPath(path: string) {
  try {
    return new utils.Interface(require(path))
  } catch (e) {
    throw new Error(`Failed to load abi at path ${path}`)
  }
}

function sourceOrTemplateDeclaration(
  input: DataSourceUserDeclaration,
  root: string
): DataSourceDeclaration
function sourceOrTemplateDeclaration(
  input: DataSourceUserDeclaration,
  root: string
): DataSourceDeclaration {
  const abiPath = input.abi ? input.abi : `abis/${input.name}.json`
  const abiPathAbsolute = resolveUserDefinedPath(abiPath, root)
  const abiInterface = loadAbiAtPath(abiPathAbsolute)
  const abiEvents = Object.values(abiInterface.events)

  const mappingsFile = input.file ?? `mappings/${input.name}.ts`
  // Extract and validate the list of specified event handlers.
  const eventList =
    (typeof input.events === 'function' ? input.events(abiInterface) : input.events) ?? abiEvents
  const eventHandlerDeclarations = eventList.map((item) => eventDeclaration(item))
  const eventHandlerFragments = eventHandlerDeclarations.map((item) => item.fragment)
  const availableEventSignatures = abiEvents.map((event: utils.EventFragment) =>
    event.format('minimal')
  )
  const invalidEventSignatures = eventHandlerFragments.filter(
    (item) => !availableEventSignatures.includes(item.format('minimal'))
  )

  if (invalidEventSignatures.length) {
    const a = invalidEventSignatures.map((item) => item.format('full').substring(6)).join('\n')
    const b = availableEventSignatures.map((item) => item.substring(6)).join('\n')

    console.error(`Invalid events:\n\n${a}\n\nAvailable events:\n\n${b}\n`)
    process.exit(1)
  }

  return {
    name: `${input.name}${input.version ?? ''}DataSource`,
    file: mappingsFile,
    events: eventHandlerDeclarations,
    abi: {
      type: AbiDeclarationType.EVENTS,
      name: `${input.name}${input.version ?? ''}Events`,
      file: `generated/abis/events/${input.name}${input.version ?? ''}Events.json`,
      events: eventHandlerFragments,
      interface: abiInterface
    }
  }
}

export function sourceDeclaration(
  source: DataSourceUserDeclaration,
  root: string
): DataSourceDeclaration {
  const baseDeclaration = sourceOrTemplateDeclaration(source, root)

  return {
    ...baseDeclaration,
    ...(source.address ? { address: source.address } : undefined),
    ...(source.block ? { block: source.block } : undefined)
  }
}
