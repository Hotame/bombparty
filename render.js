let elems = {};
let renderstate = {};

function x(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function insert_game_html() {
  document.getElementsByTagName("game")[0].innerHTML = `
        <span id="prompt"></span>
        <div style="display: grid; grid-auto-flow: column;">
            <span id="input"></span><span id="timer"></span>
        </div>
        <div id="bonus"></div>
        <span id="order"></span>
        <h3>Username:
            <span id="username"></span>
            <button type="button" onclick="changeName()">change</button>
        </h3>
        <div id="buttons"></div>
        <h2>Players on server:</h1>
        <ul id='players'></ul>
    `;
  [
    "prompt",
    "bonus",
    "input",
    "timer",
    "order",
    "username",
    "buttons",
    "players",
  ].forEach((x) => {
    elems[x] = document.getElementById(x);
  });
  timerLoop();

  let host_panel = document.getElementById("bottom_panel");
  if (host_panel) {
    host_panel.replaceChildren(document.getElementById("settings").content.cloneNode(true));
    document.getElementById("anyone_can_start_input").value = DEFAULT_ANYONE_CAN_START;
    document.getElementById("seconds_input").value = DEFAULT_SECONDS;
    document.getElementById("lives_input").value = DEFAULT_LIVES;
    document.getElementById("alphabet_input").value = DEFAULT_ALPHABET;
  }
}

function render(state, label) {
  elems["username"].innerHTML = x(state.players[label]);
  elems["buttons"].innerHTML = `
        ${
          label in state.queue
            ? '<button type="button" onclick="leaveGame()">Leave game</button>'
            : '<button type="button" onclick="enterGame()">Join next game</button>'
        }
    `;
  renderPlayers(state);

  if (!state.started) {
    ["prompt", "bonus", "input", "timer", "order"].forEach(
      (x) => (elems[x].innerHTML = "")
    );
    if (label in state.queue) {
      if (state.settings.anyone_can_start || IS_HOST) {
        elems["buttons"].innerHTML =
          '<button onclick="startGame()">Start Game</button>' +
          elems["buttons"].innerHTML;
      } else {
        elems["buttons"].innerHTML =
          "<button disabled>Waiting for host to start</button>" +
          elems["buttons"].innerHTML;
      }
    }
  } else {
    renderTimer(state);
    renderPrompt(state);
    renderBonus(state, label);
    renderInput(state, label);
    renderOrder(state);
  }
}

function renderTimer(state) {
  elems["timer"].innerHTML = `(${Math.max(
    0,
    ~~Math.ceil((state.game.deadline - Date.now()) / 1000)
  )} sec)`;
}

function renderInput(state, label) {
  let isMyTurn = state.game.order[state.game.turn] == label;
  let textinput = document.getElementById("textinput");
  if (!textinput) {
    elems[
      "input"
    ].innerHTML = `<input type='text' id='textinput' onkeyup='typed(this)' onchange='submit(this)' ${
      !isMyTurn ? "disabled" : ""
    } value='${state.game.typed}'>`;
    textinput = document.getElementById("textinput");
  } else if (!isMyTurn || (state.game.typed == "" && textinput.disabled)) {
    textinput.value = state.game.typed;
  }
  textinput.disabled = !isMyTurn;
  if (isMyTurn && state.game.typed == "") {
    textinput.focus();
  }
}

function renderPrompt(state) {
  elems["prompt"].innerHTML = `<h2>Type a word containing: ${x(
    state.game.query
  )}</h2>`;
}

function renderBonus(state, label) {
  if (state.game.order.includes(label)) {
    let letters_to_use = "";
    for (const [key, value] of Object.entries(state.game.letters[label])) {
      if (value > 0) {
        letters_to_use += key;
      }
    }
    if (letters_to_use.length > 0) {
      elems["bonus"].innerHTML = `Bonus life when using all letters: ${x(
        letters_to_use
      )}`;
    } else {
      elems["bonus"].innerHTML = "";
    }
  }
}

function renderOrder(state) {
  elems["order"].innerHTML =
    "<ul>" +
    state.game.order
      .map((label, idx) => {
        let name = x(state.players[label]);
        let turn = state.game.turn == idx;
        if (turn) {
          name = `<b>${name}</b>`;
        }
        return `<li ${turn ? "" : 'style="list-style:none"'}>${
          IS_HOST ? kickInOrder(label) : ""
        } ${name} ${hearts(state.game.lives[label])} - ${x(
          state.game.lastSolve[label]
        )}</li>`;
      })
      .join("") +
    "</ul>";
}

function kickInOrder(label) {
  return `<span onclick="removePlayerFromGame('${x(
    label
  )}');sendStateUpdate()">&#10060;</span>`;
}

function renderPlayers(state) {
  elems["players"].innerHTML = Object.keys(state.players)
    .map((label) => {
      let name = x(state.players[label]);
      let queued = label in state.queue;
      if (queued) {
        name = `<b>${name}</b>`;
      }
      return `<li ${queued ? "" : 'style="list-style:none"'}>${name}</li>`;
    })
    .join("");
}

function timerLoop() {
  if (state?.started && state?.game?.deadline) {
    setTimeout(() => {
      renderTimer(state);
      timerLoop();
    }, (state.game.deadline - Date.now()) % 1000);
  } else {
    elems["timer"].innerHTML = "";
    setTimeout(() => {
      timerLoop();
    }, 1000);
  }
}

function hearts(times) {
  return (String.fromCodePoint(10084) + String.fromCodePoint(65039)).repeat(
    times
  );
}
