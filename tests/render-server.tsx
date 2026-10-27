import { render } from "@testing-library/react";
import { cloneElement, isValidElement, Suspense, type ReactElement, type ReactNode } from "react";

/** Componente asíncrono (Server Component): se ejecuta aquí; los demás quedan para React. */
const isAsync = (type: unknown): type is (props: unknown) => Promise<ReactNode> =>
  typeof type === "function" && type.constructor.name === "AsyncFunction";

const isHookError = (error: unknown) =>
  error instanceof Error &&
  /hook|reading 'use|dispatcher|useContext|useState|useId|useRef|useEffect|useActionState|useTransition|usePathname|useMemo|useRouter/i.test(
    error.message,
  );

/**
 * Resuelve un árbol con Server Components: espera promesas y componentes async, y deja el resto
 * (componentes cliente y síncronos) a React. Suspense se reemplaza por su contenido.
 * No usa Children.*: en React 19 "usan" (lanzan) las promesas que encuentran como hijos.
 */
export async function resolveServerTree(node: unknown): Promise<ReactNode> {
  const value = await node;
  if (Array.isArray(value)) return (await Promise.all(value.map(resolveServerTree))) as ReactNode;
  if (!isValidElement(value)) return value as ReactNode;
  const element = value as ReactElement<{ children?: unknown }>;
  if (isAsync(element.type)) return resolveServerTree(element.type(element.props));
  if (element.type === Suspense) return resolveServerTree(element.props.children);
  if (typeof element.type === "function" && !element.type.prototype?.isReactComponent) {
    // Componente síncrono: si no usa hooks (componente del servidor) se expande aquí, porque
    // puede contener Suspense con promesas; los de cliente fallan fuera de React y se dejan.
    try {
      return await resolveServerTree(
        (element.type as (props: unknown) => ReactNode)(element.props),
      );
    } catch (error) {
      if (!isHookError(error)) throw error;
    }
  }
  if (element.props?.children === undefined) return element;
  const children = await resolveServerTree(element.props.children);
  return cloneElement(element, undefined, children);
}

/** Renderiza una página del App Router (con params/searchParams como promesas). */
export async function renderServer(node: unknown) {
  return render(<>{await resolveServerTree(node)}</>);
}

export const pageProps = <P extends object, S extends object = Record<string, string>>(
  params: P,
  searchParams: S = {} as S,
) => ({ params: Promise.resolve(params), searchParams: Promise.resolve(searchParams) }) as never;
