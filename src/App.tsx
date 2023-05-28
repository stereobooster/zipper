import { arrayToList } from "./List";
import { VizualizeListZipper } from "./VizualizeListZipper";

const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const initialList = arrayToList(array);

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
        <VizualizeListZipper initialList={initialList} prefix="1" />
      </section>
      <section>
        <div style={{ paddingLeft: 90 }}>
          <h2>Zipper</h2>
          <h3>Zipper for a linked list</h3>
          <p>Use arrows to see how zipper changes</p>
        </div>
        <VizualizeListZipper
          initialList={initialList}
          prefix="2"
          showZipper
          showControls
        />
        <div style={{ paddingLeft: 90 }}>
          <ul>
            <li>Red and gray nodes represent items from original list</li>
            <li>
              There are no references to gray items from Zipper, which means if
              there are no references from the outside they could be remove by
              garbag collector
            </li>
            <li>
              When zipper is created it doesn't need to traverse structure
              upfront. We put first element in focus and the rest of the list in
              the right context (suffix)
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
              If we woul navigate to the end to the list, Zipper will be fully
              "detached" from the original list
            </li>
            <li>
              Pink "zone" represnts Zipper itself - left context (prefix),
              focus, right context (suffix)
            </li>
          </ul>
        </div>
      </section>
      <br/><br/><br/><br/><br/>
    </>
  );
};

export default App;
