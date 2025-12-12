import { AnchorHTMLAttributes, PropsWithChildren } from 'react';

export function Link(props: AnchorHTMLAttributes<HTMLAnchorElement> & PropsWithChildren) {
  return <a className="link" {...props}>{props.children}</a>;
}
