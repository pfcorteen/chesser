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
               <option key={0} value={"human v human"}>Human v human</option>,
               <option key={1} value={"human v computer"}>Human v computer</option>,
               <option key={2} value={"computer v human"}>Computer v human</option>,
               <option key={3} value={"computer v computer"}>Computer v computer</option>
               <option key={4} value={"Run Tests"}>Run Tests</option>
               <option key={5} value={"New Game"}>New Game</option>,
          </select>
      </div>
    );
  }
}
