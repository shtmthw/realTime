import { Fragment } from 'react';

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/** Renders text with http(s) links made clickable. Everything else stays plain text. */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-2 hover:opacity-80"
          >
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
