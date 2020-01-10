import { mapToObject, keyBy, groupBy, mapValues, shuffle } from '../src/utils';

describe('mapToObject', () => {
  it('maps an array to an object', () => {
    const array = ['foo', 'bar', 'baz', 'qux'];
    expect(mapToObject(array, str => ({ str }))).toMatchInlineSnapshot(`
      Object {
        "bar": Object {
          "str": "bar",
        },
        "baz": Object {
          "str": "baz",
        },
        "foo": Object {
          "str": "foo",
        },
        "qux": Object {
          "str": "qux",
        },
      }
    `);
  });
});

describe('keyBy', () => {
  it('keys an array to an object', () => {
    const array = ['foo', 'bar', 'baz', 'qux'];
    expect(keyBy(array, str => `123-${str}`)).toMatchInlineSnapshot(`
      Object {
        "123-bar": "bar",
        "123-baz": "baz",
        "123-foo": "foo",
        "123-qux": "qux",
      }
    `);
  });
});

describe('groupBy', () => {
  it('group an array in to an object', () => {
    const array = ['foo', 'bar', 'baz', 'qux'];
    expect(groupBy(array, str => str[0])).toMatchInlineSnapshot(`
      Object {
        "b": Array [
          "bar",
          "baz",
        ],
        "f": Array [
          "foo",
        ],
        "q": Array [
          "qux",
        ],
      }
    `);
  });
});

describe('mapValues', () => {
  it('maps the values of an object', () => {
    const obj = { foo: 1, bar: 2, baz: 3, qux: 4 };
    expect(mapValues(obj, num => num * 2)).toMatchInlineSnapshot(`
      Object {
        "bar": 4,
        "baz": 6,
        "foo": 2,
        "qux": 8,
      }
    `);
  });
});

describe('shuffle', () => {
  it('shuffles an array', () => {
    const array = [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
    ];
    const arrayCopy = [...array];
    shuffle(arrayCopy);
    expect(array.length).toBe(arrayCopy.length);
    expect(arrayCopy).not.toEqual(array);
    expect(arrayCopy.sort()).toEqual(array.sort());
  });
});
