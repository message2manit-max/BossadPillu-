import { expect, test } from 'claude-code/testing'

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const finishTurn = (durationMs: number) => ({
  answer: 'done',
  durationMs,
  isAborted: false,
  turnId: `t${durationMs}`,
  reason: 'answer' as const,
})

test('the band counts turns and tool calls, and hides', async ($, on) => {
  on('turn.complete', async (_, e) => ({ text: e.answer }))
  on('tool.call', async () => ({ result: 'file contents' }))
  on('ui.render', async (_, e) => {
    const { Box } = _.ui.resolve(e)

    return <Box key="engine" />
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'session-pulse', surface, ...BAND })
    expect(await ui.find({ key: 'pulse' })).toBeUndefined()
    await ui.unmount()
  }

  await $.tool.call({ tool: 'Read', file_path: '/tmp/x' })
  await $.turn.complete(finishTurn(4200))
  await $.turn.complete(finishTurn(14000))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'session-pulse', surface, ...BAND })
    const text = (await ui.find({ key: 'pulse' }))?.text
    expect(text).toContain('2 turns')
    expect(text).toContain('1 tool call ·')
    expect(text).toContain('last turn 14s')
    await ui.unmount()
  }

  const ui = await $.ui.mount({ plugin: 'session-pulse', surface: 'terminal', ...BAND })
  await ui.press({ key: 'hide' })
  expect(await ui.find({ key: 'pulse' })).toBeUndefined()
  await ui.unmount()
})
