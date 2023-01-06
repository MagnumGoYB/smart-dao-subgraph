import { utils } from 'ethers'

export enum AbiDeclarationType {
  'EVENTS',
  'SDK'
}

export interface Context<TVariables> {
  name: string
  network: string
  variables: TVariables
  local?: boolean
}

export interface Configuration {
  sources: DataSourceUserDeclaration[]
}

export interface ManifestValues {
  network: string
  sources: DataSourceDeclaration[]
}

export interface Contexts<TVariables> {
  [context: string]: Context<TVariables>
}

export type Configurator<TVariables> = (variables: TVariables) => Configuration

export type EventHandlerUserDeclaration = string | utils.EventFragment
export interface EventHandlerDeclaration {
  event: string
  handler: string
  fragment: utils.EventFragment
}

export interface AbiDeclaration {
  type: AbiDeclarationType
  name: string
  file: string
}

export interface EventsAbiDeclaration extends AbiDeclaration {
  type: AbiDeclarationType.EVENTS
  events: utils.EventFragment[]
  interface: utils.Interface
}

export interface DataSourceDeclaration {
  name: string
  file: string
  abi: EventsAbiDeclaration
  events: EventHandlerDeclaration[]
  address?: string
  block?: number
}

export interface DataSourceUserDeclaration {
  name: string
  abi?: string
  file?: string
  version?: string | number
  address?: string
  block?: number
  events?: ((abi: utils.Interface) => EventHandlerUserDeclaration[]) | EventHandlerUserDeclaration[]
}

export interface Environment<TVariables> {
  name: string
  network: string
  local: boolean
  variables: TVariables
  manifest: ManifestValues
}
