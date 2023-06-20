import { arrayToList, cons } from "./List";
import { narryTreeToTree } from "./Tree";
import { VizualizeGrammar } from "./VizualizeGrammar";
import { VizualizeListZipper } from "./VizualizeListZipper";
import { VizualizeTreeZipper } from "./VizualizeTreeZipper";
import { narryTreeToExpression } from "./pwz";

const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const list = arrayToList(array);
const tree = narryTreeToTree([
  "a",
  [
    [
      "b",
      [
        ["e", []],
        ["f", []],
      ],
    ],
    ["c", [["j", []]]],
    ["d", [["h", []]]],
  ],
]);

const cicledTree = narryTreeToTree([
  "a",
  [
    ["b", [["d", []]]],
    ["c", []],
  ],
]);
const e = cicledTree?.children?.value?.children?.value as any;
e.children = cons(cicledTree, null);

const exp = narryTreeToExpression([
  "S",
  "Seq",
  [
    [
      "",
      "Seq",
      [
        ["a", "Tok", []],
        ["b", "Tok", []],
      ],
    ],
    [
      "",
      "Seq",
      [
        ["c", "Tok", []],
        ["d", "Tok", []],
      ],
    ],
  ],
]);

const App = () => {
  return (
    <>
      <section>
        <div style={{ paddingLeft: 90 }}>
          <h2>Linked list</h2>
          <ul>
            <li>
              is a simple data structure which allows to prepend and pop element
              (LIFO, stack)
            </li>
            <li>it can be used as immutable (persistent) data structure</li>
            <li>
              it allows to navigate only in one direction (from head to tail)
            </li>
          </ul>
          <h3>Example</h3>
          <p>
            linked list of lenght {array.length}. <b>{array[0]}</b> is a head of
            a linked list. <b>{array[array.length - 1]}</b> is a tail of a
            linked list
          </p>
        </div>
        <VizualizeListZipper list={list} prefix="1" />
      </section>
      <section>
        <div style={{ paddingLeft: 90 }}>
          <h2>Zipper</h2>
          <h3>Zipper for a linked list</h3>
          <p>Use arrows to see how zipper changes</p>
        </div>
        <VizualizeListZipper list={list} prefix="2" showZipper />
        <div style={{ paddingLeft: 90 }}>
          <ul>
            <li>Red and gray nodes represent items from original list</li>
            <li>
              There are no references to gray items from Zipper, which means if
              there are no references from the outside they could be removed by
              garbage collector
            </li>
            <li>
              When zipper is created it doesn't need to traverse structure
              upfront. We put first element in the focus and the rest of the
              list in the right context (suffix)
            </li>
            <li>
              Blue and green nodes represent new list which zipper builds upon
              navigation
            </li>
            <li>
              We can change value in focus and continue navigation. This won't
              change value in original list
            </li>
            <li>
              If we would navigate to the end to the list, Zipper will be fully
              "detached" from the original list
            </li>
            <li>
              Pink "zone" represnts Zipper itself - left context (prefix),
              focus, right context (suffix)
            </li>
          </ul>
        </div>
      </section>
      <section>
        <div style={{ paddingLeft: 90 }}>
          <h2>Tree</h2>
        </div>
        <VizualizeTreeZipper tree={tree} />
        <div style={{ paddingLeft: 90 }}>
          <ul>
            <li>
              "DAG" vizualization - is how we typically imagine tree data
              structure. Actually this vizualization more appropriate for{" "}
              <a href="https://en.wikipedia.org/wiki/Directed_acyclic_graph">
                Directed Acyclic Graph
              </a>
              . In DAG children may be unordered.
            </li>
            <li>
              "LCRS tree" vizualization - this is how typically{" "}
              <a href="https://en.wikipedia.org/wiki/Left-child_right-sibling_binary_tree">
                Left-child right-sibling tree
              </a>{" "}
              vizualized. It shows that children in tree are ordered.
            </li>
          </ul>
        </div>
      </section>
      <section>
        <div style={{ paddingLeft: 90 }}>
          <h3>Zipper for a tree</h3>
          <p>Use arrows to see how zipper changes</p>
        </div>
        <VizualizeTreeZipper
          tree={tree}
          showZipper
          showTree
          height={300}
          width={600}
        />
        <div style={{ paddingLeft: 90 }}>
          <ul>
            <li>
              Pink "zone" represnts Zipper itself - left context, focus, right
              context, top context
            </li>
            <li>Zipper vizualization "makes more sense" in "LCRS tree" mode</li>
          </ul>
        </div>
      </section>
      <section>
        <div style={{ paddingLeft: 90 }}>
          <h2>"Cycled tree"</h2>
        </div>
        <VizualizeTreeZipper tree={cicledTree} />
        <div style={{ paddingLeft: 90 }}>
          <ul>
            <li>
              I call it "cycled tree", because it is the same data structure as
              tree, but cycle is created using mutation (or letrec). It is
              actually graph.
            </li>
          </ul>
        </div>
      </section>
      <section>
        <div style={{ paddingLeft: 90 }}>
          <h3>Zipper for a "cycled tree"</h3>
          <p>Use arrows to see how zipper changes.</p>
        </div>
        <VizualizeTreeZipper
          tree={cicledTree}
          showZipper
          height={600}
          width={600}
        />
        <div style={{ paddingLeft: 90 }}>
          <ul>
            <li>
              Cycled structure serves as pattern to generate infinite structure
              in Zipper.
            </li>
          </ul>
        </div>
      </section>
      {false && (
        <section>
          <div style={{ paddingLeft: 90 }}>
            <h2>Grammar</h2>
          </div>
          <VizualizeGrammar tree={exp} />
        </section>
      )}
    </>
  );
};

export default App;
