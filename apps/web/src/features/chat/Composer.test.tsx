import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Composer } from './Composer';

describe('Composer', () => {
  it('disables sending while empty or whitespace', async () => {
    render(<Composer onSend={() => undefined} />);
    const send = screen.getByRole('button', { name: /send message/i });
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Message'), '   ');
    expect(send).toBeDisabled();
  });

  it('sends trimmed text on Enter and clears the box', async () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    const box = screen.getByLabelText('Message');
    await userEvent.type(box, '  hello there {Enter}');
    expect(onSend).toHaveBeenCalledExactlyOnceWith('hello there');
    expect(box).toHaveValue('');
  });

  it('keeps Shift+Enter for new lines', async () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    const box = screen.getByLabelText('Message');
    await userEvent.type(box, 'one{Shift>}{Enter}{/Shift}two');
    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue('one\ntwo');
  });

  it('sends with the button and reports typing', async () => {
    const onSend = vi.fn();
    const onTyping = vi.fn();
    render(<Composer onSend={onSend} onTyping={onTyping} />);
    await userEvent.type(screen.getByLabelText('Message'), 'hi');
    expect(onTyping).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(onSend).toHaveBeenCalledWith('hi');
  });
});
