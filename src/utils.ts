export const mapToObject = <T extends number | string | symbol, S>(
  array: readonly T[],
  iteratee: (elem: T) => S
): { [K in T]: S } =>
  Object.assign({}, ...array.map(elem => ({ [elem]: iteratee(elem) })));

export const keyBy = <T, S extends number | string | symbol>(
  array: readonly T[],
  iteratee: (elem: T) => S
): { [K in S]: T } =>
  Object.assign({}, ...array.map(elem => ({ [iteratee(elem)]: elem })));

export const groupBy = <T, S extends number | string | symbol>(
  array: readonly T[],
  iteratee: (elem: T) => S
): { [K in S]: T[] } =>
  array.reduce((agg, elem) => {
    const key = iteratee(elem);
    return { ...agg, [key]: [...(agg[key] ? agg[key] : []), elem] };
  }, {} as { [K in S]: T[] });

export const mapValues = <T, S extends number | string | symbol, U>(
  obj: { [K in S]: T },
  iteratee: (elem: T) => U
): { [K in S]: U } =>
  Object.assign(
    {},
    ...(Object.entries(obj) as Array<[string, T]>).map(([key, elem]) => ({
      [key]: iteratee(elem),
    }))
  );

export const enumValues = <T extends object>(enumObject: T): T[keyof T][] =>
  Object.values(enumObject);

/**
 *
 * @param array this array is mutatively shuffled
 */
export function shuffle(array: unknown[]) {
  var i = 0,
    j = 0,
    temp = null;

  for (i = array.length - 1; i > 0; i -= 1) {
    j = Math.floor(Math.random() * (i + 1));
    temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

interface IExhaustiveSwitchArgs {
  switchValue: never;
  errorMessage?: string;
}

export const exhaustiveSwitch = ({
  switchValue,
  errorMessage,
}: IExhaustiveSwitchArgs) => {
  throw new Error(
    errorMessage || `Received invalid switch value: \`${switchValue}\`.`
  );
};

type NotNull<T> = T extends null ? never : T;
export const isNotNull = <T>(arg: T): arg is NotNull<T> => arg !== null;

type NotUndefined<T> = T extends undefined ? never : T;
export const isNotUndefined = <T>(arg: T): arg is NotUndefined<T> =>
  arg !== undefined;
