import { mergeStylesFunctionString, getClassNameFunctionString, getStyleFunctionString } from '../constants';
import syntaxJSX from 'babel-plugin-syntax-jsx';
import { transform } from 'babel-core';
import jSXStylePlugin from '../index';

export default function getTransformCode(code, opts) {
  return transform(code, {
    plugins: [
      [jSXStylePlugin, opts],
      syntaxJSX
    ]
  }).code;
}

describe('jsx style plugin', () => {
  it('transform only one className to style as member', () => {
    expect(getTransformCode(`
import { createElement, Component } from 'rax';
import './app.css';

class App extends Component {
  render() {
    return <div className="header" />;
  }
}`)).toBe(`
import { createElement, Component } from 'rax';
import appStyleSheet from './app.css';

var _styleSheet = appStyleSheet;
class App extends Component {
  render() {
    return <div style={_styleSheet["header"]} />;
  }
}`);
  });

  it('transform multiple classNames to style as array', () => {
    expect(getTransformCode(`
import { createElement, Component } from 'rax';
import './app.css';

class App extends Component {
  render() {
    return <div className="header1 header2" />;
  }
}`)).toBe(`
import { createElement, Component } from 'rax';
import appStyleSheet from './app.css';

var _styleSheet = appStyleSheet;
class App extends Component {
  render() {
    return <div style={Object.assign({}, _styleSheet["header1"], _styleSheet["header2"])} />;
  }
}`);
  });

  it('transform array, object and expressions', () => {
    expect(getTransformCode(`
import { createElement, Component } from 'rax';
import './app.css';

class App extends Component {
  render() {
    return <div className={'header'}>
      <div className={{ active: props.isActive }} />
      <div className={['header1 header2', 'header3', { active: props.isActive }]} />
      <div className={props.visible ? 'show' : 'hide'} />
      <div className={getClassName()} />
    </div>;
  }
}`)).toBe(`
import { createElement, Component } from 'rax';
import appStyleSheet from './app.css';

var _styleSheet = appStyleSheet;

${getClassNameFunctionString()}

${getStyleFunctionString()}

class App extends Component {
  render() {
    return <div style={_styleSheet["header"]}>
      <div style={_getStyle({ active: props.isActive })} />
      <div style={_getStyle(['header1 header2', 'header3', { active: props.isActive }])} />
      <div style={_getStyle(props.visible ? 'show' : 'hide')} />
      <div style={_getStyle(getClassName())} />
    </div>;
  }
}`);
  });

  it('combine one style and className', () => {
    expect(getTransformCode(`
import { createElement, Component } from 'rax';
import './app.css';
import styles from './style.css';

class App extends Component {
  render() {
    return <div className="header2" style={styles.header1} />;
  }
}`)).toBe(`
import { createElement, Component } from 'rax';
import appStyleSheet from './app.css';
import styles from './style.css';

var _styleSheet = appStyleSheet;
class App extends Component {
  render() {
    return <div style={Object.assign({}, _styleSheet["header2"], styles.header1)} />;
  }
}`);
  });

  it('combine inline style object and className', () => {
    expect(getTransformCode(`
import { createElement, Component } from 'rax';
import './app.css';

class App extends Component {
  render() {
    return <div className="header" style={{
      height: 100
    }} />;
  }
}`)).toBe(`
import { createElement, Component } from 'rax';
import appStyleSheet from './app.css';

var _styleSheet = appStyleSheet;
class App extends Component {
  render() {
    return <div style={Object.assign({}, _styleSheet["header"], {
      height: 100
    })} />;
  }
}`);
  });

  it('combine multiple styles and className', () => {
    expect(getTransformCode(`
import { createElement, Component } from 'rax';
import './app.css';
import styles from './style.css';

class App extends Component {
  render() {
    return <div className="header2" style={[styles.header1, styles.header3]} />;
  }
}`)).toBe(`
import { createElement, Component } from 'rax';
import appStyleSheet from './app.css';
import styles from './style.css';

var _styleSheet = appStyleSheet;
class App extends Component {
  render() {
    return <div style={[_styleSheet["header2"], styles.header1, styles.header3]} />;
  }
}`);
  });

  it('do not transfrom code when no css file', () => {
    const code = `
import { createElement, Component } from 'rax';

class App extends Component {
  render() {
    return <div className="header" />;
  }
}`;

    expect(getTransformCode(code)).toBe(code);
  });

  it('transform scss file', () => {
    expect(getTransformCode(`
import { createElement, Component } from 'rax';
import './app.scss';

class App extends Component {
  render() {
    return <div className="header" />;
  }
}`)).toBe(`
import { createElement, Component } from 'rax';
import appStyleSheet from './app.scss';

var _styleSheet = appStyleSheet;
class App extends Component {
  render() {
    return <div style={_styleSheet["header"]} />;
  }
}`);
  });

  it('transform constant elements in render', () => {
    expect(getTransformCode(`
import { createElement, render } from 'rax';
import './app.css';

render(<div className="header" />);
`)).toBe(`
import { createElement, render } from 'rax';
import appStyleSheet from './app.css';

var _styleSheet = appStyleSheet;
render(<div style={_styleSheet["header"]} />);`);
  });

  it('dont remove className', () => {
    expect(getTransformCode(`
import { createElement, render } from 'rax';
import './app.css';

render(<div className="header" />);
`, { retainClassName: true })).toBe(`
import { createElement, render } from 'rax';
import appStyleSheet from './app.css';

var _styleSheet = appStyleSheet;
render(<div className="header" style={_styleSheet["header"]} />);`);
  });
});

describe('test development env', () => {
  let lastEnv;
  beforeEach(() => {
    lastEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
  });

  it('transform constant element in development env', () => {
    expect(getTransformCode(`
import { createElement, render } from 'rax';
import './app.css';

render(<div className="header" />);
`)).toBe(`
import { createElement, render } from 'rax';
import appStyleSheet from './app.css';

var _styleSheet = appStyleSheet;
render(<div __class="header" style={_styleSheet["header"]} />);`);
  });

  afterEach(() => {
    process.env.NODE_ENV = lastEnv;
  });
});

describe('edge test', () => {
  it('transform class and style import same file', () => {
    expect(getTransformCode(`
import { createElement, render } from 'rax';
import './app.css';
import styles from './app.css';

render(<div className="header1" style={styles.header} />);
`)).toBe(`
import { createElement, render } from 'rax';
import appStyleSheet from './app.css';
import styles from './app.css';

var _styleSheet = appStyleSheet;
render(<div style={Object.assign({}, _styleSheet["header1"], styles.header)} />);`);
  });

  it('should transform two class files', () => {
    expect(getTransformCode(`
import { createElement, render } from 'rax';
import './app1.css';
import './app2.css';

render(<div className="header1 header2" />);
`)).toBe(`${mergeStylesFunctionString()}

import { createElement, render } from 'rax';
import app1StyleSheet from './app1.css';
import app2StyleSheet from './app2.css';

var _styleSheet = _mergeStyles(app1StyleSheet, app2StyleSheet);

render(<div style={Object.assign({}, _styleSheet["header1"], _styleSheet["header2"])} />);`);
  });

  it('should delete className attr when empty string', () => {
    expect(getTransformCode(`
import { createElement, render } from 'rax';
import 'app.css'

render(<div className="" />);
`)).toBe(`
import { createElement, render } from 'rax';
import appStyleSheet from 'app.css';

var _styleSheet = appStyleSheet;
render(<div />);`);
  });
});
