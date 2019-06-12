import * as React from "react";
import { IConfigControl } from "./Model";

export class ConfigurationControls extends React.PureComponent<IConfigControl, {}> {

  handlePlayerChange = (e: Event): void => {
    const
      targetElm = e.target as HTMLInputElement,
      players: string = targetElm.value;
    this.props.onPlayerChange(players);
  }
  handleFlipOrientation = (): void => {
    this.props.onFlipOrientation();
  }
  handleFlipSquareHighlights = (): void => {
    this.props.onFlipSquareHighlights();
  }
  handleFlipPause = (): void => {
    this.props.onFlipPause();

  }
  render() {
    return (
      <div id="configControls">
        <button className={"config"} onClick={this.handleFlipOrientation.bind(this)}>Flip Orientation</button>
        <button className={"config"} onClick={this.handleFlipSquareHighlights.bind(this)}>Flip Square Highlights</button>
        <button className={"config"} onClick={this.handleFlipPause.bind(this)}>Pause/Continue</button>
        <select className={"config"} name="players" onChange={this.handlePlayerChange.bind(this)}>
          <option key={0} value={"New Game"}>New Game</option>,
          <option key={1} value={"human v human"}>human v human</option>,
          <option key={2} value={"human v computer"}>human v computer</option>,
          <option key={3} value={"computer v human"}>computer v human</option>,
          <option key={4} value={"computer v computer"}>computer v computer</option>
          <option key={5} value={"test"}>test</option>
        </select>
      </div>
    );
  }
}
