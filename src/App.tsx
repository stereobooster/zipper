import { arrayToList, cons } from "./List";
import { narryTreeToTree } from "./Tree";
import { VizualizeGrammar } from "./VizualizeGrammar";
import { VizualizeListZipper } from "./VizualizeListZipper";
import { VizualizeTreeZipper } from "./VizualizeTreeZipper";
import { paragraph } from "./common";
import { alt, exc, ign, lex, plus, recs, seq, star } from "./pwzDSL";
import { grammarExpression, parseGrammar } from "./pwzGrammar";

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

// Diffrent trees for almost the same grammar:
// const str = "aa";
// S -> ϵ | x S
// const exp = rec((S) => alt("S", ["", seq("", ["a", S])]));
// S -> ϵ | S x
// const exp = rec((S) => alt("S", ["", seq("", [S, "a"])]));
// Kleene star: S -> a*
// const exp = star("S", "a")

// arithmetic expression: S -> S + S | 0-9
// const str = "10+2+3";
// const int = lex("int", alt("", ["0", seq("", ["1-9", star("", "0-9")])]))
// const exp = rec((S) => alt("Exp", [seq("", [S, "+", S]), int]));

// quoted string: S -> "(^"|\")*"
// const str = '"a\\"c"';
// const exp = seq("", [
//   ign("", '"'),
//   lex("Str", star("", alt("", [exc('"'), seq("", ["\\", '"'])]))),
//   ign("", '"'),
// ]);

// nested parentheses: S -> ("(" S ")")*
// const str = "()(())";
// const exp = rec((S) => star("S", seq("", ["(", S, ")"])))

// highly ambigious: S -> a* a*
// const str = "aa";
// const exp = seq("S", [star("1st", "a"), star("2nd", "a")])

// const str = 's -> "" | "a" s';
// const exp = grammarExpression;
// const str = 's -> "" | "(" s ")"'

const exp = parseGrammar('s -> "" | "a" s');
const str = "aa";

// TODO: I think this is a bug in the original paper it can't handle S -> SS | "" | a

const App = () => {
  return (
    <>
      <section>
        <div style={paragraph}>
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
        <div style={paragraph}>
          <h2>Zipper</h2>
          <h3>Zipper for a linked list</h3>
        </div>
        <VizualizeListZipper list={list} prefix="2" showZipper />
        <div style={paragraph}>
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
        <div style={paragraph}>
          <h2>Tree</h2>
        </div>
        <VizualizeTreeZipper tree={tree} />
        <div style={paragraph}>
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
        <div style={paragraph}>
          <h3>Zipper for a tree</h3>
        </div>
        <VizualizeTreeZipper
          tree={tree}
          showZipper
          showTree
          height={300}
          width={600}
        />
        <div style={paragraph}>
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
        <div style={paragraph}>
          <h2>"Cycled tree"</h2>
        </div>
        <VizualizeTreeZipper tree={cicledTree} />
        <div style={paragraph}>
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
        <div style={paragraph}>
          <h3>Zipper for a "cycled tree"</h3>
          <ul>
            <li>
              Cycled structure serves as pattern to generate infinite structure
              in Zipper.
            </li>
          </ul>
        </div>
        <VizualizeTreeZipper
          tree={cicledTree}
          showZipper
          height={600}
          width={600}
        />
      </section>
      <section>
        <div style={paragraph}>
          <h2>Parsing with zippers</h2>
          <ul>
            <li>
              Based on{" "}
              <a href="https://dl.acm.org/doi/pdf/10.1145/3408990">
                Parsing with Zippers
              </a>
              , 2020
            </li>
            <li>
              Parser returns list of zippers. It is hard to understand what is
              happening when all zippers are shown at once, so you can select to
              show only one zipper at a time
            </li>
            <li>
              For each zipper vizualization shows current depth of focus and
              direction of next move
            </li>
            <li>
              "Derivate" button makes one move for one zipper at a time. Next
              move shown in red
            </li>
            <li>
              Current position in string which is being parsed shown in red
            </li>
            <li>
              Vizualization doesn't show memoized zippers (See `mem` in original
              paper). So sometimes it seems like there is nowhere to move in the
              zipper, but new paths appear out of nowhere
            </li>
            <li>
              Vizualization doesn't show left and right empty nodes for zipper
              to remove vizual noise
            </li>
          </ul>
        </div>
        <VizualizeGrammar tree={exp} str={str} />
      </section>
    </>
  );
};

export default App;
