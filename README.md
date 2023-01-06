# Smart DAO Subgraphs

## Installation

Before you can use the Enzyme subgraphs, make sure you have the latest versions of [Node.js](https://nodejs.org), [pnpm](https://pnpm.io) installed.

Install project dependencies from the main directory:

```sh
pnpm install
```

## Subgraph Contexts

Each subgraph can be used in different contexts, i.e. for different deployements and chains.

Default contexts are:

- goerli

## Run code generators for a subgraph

In order to generate a `subgraph.yaml` file and AssemblyScript classes for a specific subgraph, go to the subgraph directory (in `/subgraphs/name-of-subgraph`) and run

```sh
pnpm codegen <context>
```

## Build a subgraph

Code generation does not check your mapping code. If you want to check the mapping code before uploading it, run

```sh
pnpm build <context>
```

## Deploy a subgraph

To deploy a subgraph to the default location, you need to be logged into the Graph CLI:

```sh
pnpm graph auth
```

Once logged in, go to the subgraph directory (in `/subgraphs/name-of-subgraph`) and run

```sh
pnpm upload <context>
```
