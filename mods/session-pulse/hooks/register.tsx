import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Pulse } from '../types'

const EMPTY: Pulse = { turns: 0, tools: 0, lastSeconds: null }

const pulse = atom({ plugin: 'session-pulse', key: 'pulse' } as const, EMPTY)
const isHidden = atom({ plugin: 'session-pulse', key: 'isHidden' } as const, false)

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pulse',
      description: 'Show or hide the session pulse band above the prompt',
    })

    return next(e)
  })

  on('command.run', { command: 'pulse' }, async $ => {
    const hidden = await update($, isHidden, was => !was)

    return { text: hidden ? 'Session pulse hidden.' : 'Session pulse shown.' }
  })

  on('tool.call', async ($, e, next) => {
    await update($, pulse, p => ({ ...p, tools: p.tools + 1 }))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const lastSeconds = Math.round(e.durationMs / 1000)
      await update($, pulse, p => ({ ...p, turns: p.turns + 1, lastSeconds }))
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const p = await read($, pulse)
    const isQuiet = e.props.hasSurvey || p.turns === 0 || (await read($, isHidden))

    if (isQuiet) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const last = p.lastSeconds === null ? '' : ` · last turn ${p.lastSeconds}s`

    return (
      <Box key="pulse">
        <Text dimColor>
          Pulse · {plural(p.turns, 'turn')} · {plural(p.tools, 'tool call')}
          {last}{' '}
        </Text>
        <Button
          key="hide"
          label="Hide"
          onPress={() => update($, isHidden, () => true)}
        />
      </Box>
    )
  })
}
