
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const toRadians = (x, degrees) => degrees ? x * Math.PI / 180 : x;
const fromRadians = (x, degrees) => degrees ? x * 180 / Math.PI : x;

const FUNCTIONS = {
  sin: (x, deg) => Math.sin(toRadians(x, deg)),
  cos: (x, deg) => Math.cos(toRadians(x, deg)),
  tan: (x, deg) => {
    const r = toRadians(x, deg);
    if (Math.abs(Math.cos(r)) < 1e-12) throw Error("Undefined tangent");
    return Math.tan(r);
  },
  asin: (x, deg) => fromRadians(Math.asin(x), deg),
  acos: (x, deg) => fromRadians(Math.acos(x), deg),
  atan: (x, deg) => fromRadians(Math.atan(x), deg),
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  exp: Math.exp,
  reciprocal: (x) => {
    if (x === 0) throw Error("Cannot divide by zero");
    return 1 / x;
  },
};

function factorial(x) {
  if (!Number.isInteger(x) || x < 0 || x > 170) {
    throw Error("Factorial requires an integer from 0 to 170");
  }

  let result = 1;
  for (let i = 2; i <= x; i++) result *= i;
  return result;
}

function evaluateExpression(expression, degrees, answer) {
  const input = expression.replace(/\s/g, "");
  const tokens = input.match(
    /(?:\d+\.?\d*|\.\d+)|[a-zA-Z]+|[()+\-*/^%!]/g
  ) || [];

  if (!input || tokens.join("") !== input) {
    throw Error("Invalid expression");
  }

  let pos = 0;
  const peek = () => tokens[pos];

  function checked(value) {
    if (!Number.isFinite(value)) throw Error("Math error");
    return value;
  }

  function primary() {
    const token = peek();

    if (token === "(") {
      pos++;
      const value = expressionValue();
      if (peek() !== ")") throw Error("Missing )");
      pos++;
      return value;
    }

    if (/^(?:\d+\.?\d*|\.\d+)$/.test(token || "")) {
      pos++;
      return Number(token);
    }

    if (/^[a-z]+$/i.test(token || "")) {
      pos++;
      const name = token.toLowerCase();

      if (name === "pi") return Math.PI;
      if (name === "e") return Math.E;
      if (name === "ans") return answer;

      if (!(name in FUNCTIONS)) throw Error(`Unknown function: ${name}`);
      if (peek() !== "(") throw Error(`${name} requires ( )`);

      pos++;
      const arg = expressionValue();

      if (peek() !== ")") throw Error("Missing )");
      pos++;

      const result = FUNCTIONS[name](arg, degrees);
      if (Number.isNaN(result)) throw Error("Outside function domain");
      return checked(result);
    }

    throw Error("Incomplete expression");
  }

  function postfix() {
    let value = primary();

    while (peek() === "!" || peek() === "%") {
      const op = tokens[pos++];

      value = op === "!" ? factorial(value) : value / 100;
      checked(value);
    }

    return value;
  }

  function power() {
    const base = postfix();

    if (peek() === "^") {
      pos++;
      return checked(base ** unary());
    }

    return base;
  }

  function unary() {
    if (peek() === "+") {
      pos++;
      return unary();
    }

    if (peek() === "-") {
      pos++;
      return -unary();
    }

    return power();
  }

  function beginsPrimary(token) {
    return (
      token === "(" ||
      /^[a-z]+$/i.test(token || "") ||
      /^(?:\d+\.?\d*|\.\d+)$/.test(token || "")
    );
  }

  function term() {
    let value = unary();

    while (true) {
      const op = peek();

      if (op === "*" || op === "/") {
        pos++;
        const right = unary();

        if (op === "/" && right === 0) throw Error("Cannot divide by zero");
        value = checked(op === "*" ? value * right : value / right);
      } else if (beginsPrimary(op)) {
        value = checked(value * unary());
      } else {
        break;
      }
    }

    return value;
  }

  function expressionValue() {
    let value = term();

    while (peek() === "+" || peek() === "-") {
      const op = tokens[pos++];
      const right = term();
      value = checked(op === "+" ? value + right : value - right);
    }

    return value;
  }

  const result = expressionValue();
  if (pos !== tokens.length) throw Error("Invalid expression");
  return checked(result);
}

function ScientificKey({ label, value, action, type, onPress }) {
  return (
    <button
      type="button"
      className={`key key-${type || "number"}`}
      onClick={() => onPress({ label, value, action })}
      aria-label={label}
    >
      {label}
    </button>
  );
}

const KEY_ROWS = [
  [
    ["2nd", "", "second", "utility"],
    ["(", "(", "", "utility"],
    [")", ")", "", "utility"],
    ["%", "%", "", "utility"],
    ["AC", "", "clear", "danger"],
  ],
  [
    ["sin", "sin(", "", "function"],
    ["cos", "cos(", "", "function"],
    ["tan", "tan(", "", "function"],
    ["ln", "ln(", "", "function"],
    ["log", "log(", "", "function"],
  ],
  [
    ["√", "sqrt(", "", "function"],
    ["∛", "cbrt(", "", "function"],
    ["x²", "^2", "", "function"],
    ["xʸ", "^", "", "function"],
    ["÷", "/", "", "operator"],
  ],
  [
    ["7", "7", "", "number"],
    ["8", "8", "", "number"],
    ["9", "9", "", "number"],
    ["⌫", "", "backspace", "utility"],
    ["×", "*", "", "operator"],
  ],
  [
    ["4", "4", "", "number"],
    ["5", "5", "", "number"],
    ["6", "6", "", "number"],
    ["!", "!", "", "function"],
    ["−", "-", "", "operator"],
  ],
  [
    ["1", "1", "", "number"],
    ["2", "2", "", "number"],
    ["3", "3", "", "number"],
    ["π", "pi", "", "function"],
    ["+", "+", "", "operator"],
  ],
  [
    ["±", "", "sign", "utility"],
    ["0", "0", "", "number"],
    [".", ".", "", "number"],
    ["e", "e", "", "function"],
    ["=", "", "equals", "equals"],
  ],
];

const INVERSE = {
  "sin(": "asin(",
  "cos(": "acos(",
  "tan(": "atan(",
  "ln(": "exp(",
  "log(": "10^(",
  "sqrt(": "reciprocal(",
};

function App() {
  const [expression, setExpression] = useState("0");
  const [degrees, setDegrees] = useState(true);
  const [second, setSecond] = useState(false);
  const [answer, setAnswer] = useState(0);
  const [justCalculated, setJustCalculated] = useState(false);
  const [error, setError] = useState("");

  const clear = useCallback(() => {
    setExpression("0");
    setError("");
    setJustCalculated(false);
  }, []);

  const calculate = useCallback(() => {
    try {
      const result = evaluateExpression(expression, degrees, answer);
      const rounded = Number(result.toPrecision(12));

      setExpression(String(rounded));
      setAnswer(rounded);
      setError("");
      setJustCalculated(true);
    } catch (err) {
      setError(err.message || "Invalid expression");
      setJustCalculated(true);
    }
  }, [expression, degrees, answer]);

  const press = useCallback((button) => {
    const { value, action } = button;

    if (action === "clear") return clear();

    if (action === "second") {
      setSecond((current) => !current);
      return;
    }

    if (action === "equals") return calculate();

    if (action === "backspace") {
      setExpression((current) =>
        error || justCalculated || current.length <= 1
          ? "0"
          : current.slice(0, -1)
      );
      setError("");
      setJustCalculated(false);
      return;
    }

    if (action === "sign") {
      setExpression((current) =>
        current.startsWith("-")
          ? current.slice(1) || "0"
          : current === "0"
            ? "-0"
            : `-(${current})`
      );
      setError("");
      setJustCalculated(false);
      return;
    }

    let next = value;

    if (second) next = INVERSE[value] || value;

    if (error || justCalculated) {
      const continues = ["+", "-", "*", "/", "^", "%", "!"].includes(next);

      if (continues) {
        setExpression((current) => current + next);
      } else if (next === "10^(" || next === "reciprocal(" || next.endsWith("(")) {
        setExpression(next);
      } else if (next === ".") {
        setExpression("0.");
      } else {
        setExpression(next || "0");
      }

      setError("");
      setJustCalculated(false);
      return;
    }

    setExpression((current) => {
      if (current === "0") {
        if (/^\d$/.test(next)) return next;
        if (next === ".") return "0.";
        if (next === "-") return "-";
        if (["+", "*", "/", "^", "%", "!"].includes(next)) return current;
        return next || current;
      }

      return current + next;
    });

    setError("");
    setJustCalculated(false);
  }, [calculate, clear, error, justCalculated, second]);

  useEffect(() => {
    function handleKeyboard(event) {
      if (/^[0-9.]$/.test(event.key)) {
        event.preventDefault();
        press({ value: event.key });
      } else if (["+", "-", "*", "/", "^", "(", ")", "%", "!"].includes(event.key)) {
        event.preventDefault();
        press({ value: event.key });
      } else if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        calculate();
      } else if (event.key === "Backspace") {
        event.preventDefault();
        press({ action: "backspace" });
      } else if (event.key === "Escape") {
        clear();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [calculate, clear, press]);

  const display = expression
    .replace(/pi/g, "π")
    .replace(/\*/g, "×")
    .replace(/\//g, "÷");

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Nova calculator home">
          <span className="brand-mark">N</span>
          <span>nova<span className="brand-light">.calc</span></span>
        </a>
        <span className="status"><span /> Scientific mode</span>
      </header>

      <section className="hero">
        <p className="eyebrow">PRECISION MEETS SIMPLICITY</p>
        <h1>Think beyond <span>numbers.</span></h1>
        <p className="hero-copy">
          Scientific power.
        </p>
      </section>

      <section className="calculator" aria-label="Scientific calculator">
        <div className="calculator-top">
          <div>
            <p className="panel-label">SCIENTIFIC CALCULATOR</p>
            <p className="panel-caption">Advanced mathematics, made simple.</p>
          </div>
          <button
            className="angle-toggle"
            type="button"
            onClick={() => setDegrees((current) => !current)}
          >
            {degrees ? "DEG" : "RAD"}
          </button>
        </div>

        <div className="display-panel">
          <div className="display-meta">
            <span>EXPRESSION</span>
            <span>Ans = {Number(answer.toPrecision(7))}</span>
          </div>
          <div className="display-value" aria-live="polite" title={expression}>
            {display}
          </div>
          <p className={`display-hint ${error ? "display-error" : ""}`}>
            {error || (justCalculated ? "Result" : "Ready to calculate")}
          </p>
        </div>

        <div className="keypad">
          {KEY_ROWS.flat().map(([label, value, action, type]) => (
            <ScientificKey
              key={label}
              label={label}
              value={value}
              action={action}
              type={type}
              onPress={press}
            />
          ))}
        </div>

        <div className="calculator-footer">
          <span><span className="footer-dot" /> {degrees ? "Degrees" : "Radians"}</span>
          <button type="button" onClick={clear}>Clear expression ↗</button>
        </div>
      </section>

      <section className="function-notes">
        <h2>Made for more than arithmetic</h2>
        <p>
          Calculate trigonometric functions, logarithms, powers,
          factorials, roots, and expressions with parentheses.
        </p>
        <div className="example-list">
          {["sin(30)", "log(100)", "sqrt(144)", "5!", "2^8", "ln(e)"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <footer className="page-footer">
        <span>MADE FOR EVERYDAY MATHEMATICS</span>
        <span>Built with React <span className="footer-heart">♥</span> by sharmila</span>
      </footer>
    </main>
  );
}

export default App;
