import * as React from "react";
import {IPromotion, PIECE_ICONS} from "./Model";
import {Game} from "./Game";

export class Promotion extends React.Component<IPromotion, {}> {
	static getNextPromotionNumber = (): number => {
		Promotion.promotionCount += 1;
		return Promotion.promotionCount;
	};

	private static promotionCount = 0;
	private pElm: HTMLElement;

	handleClick = (event): void => {
		const el: HTMLElement = event.target;
		this.props.onPromotionSelection(el.id);
	};

	render() {
		const
			control = Game.control,
			// side = Game.nextTurn,
			currentPlayer = control.getCurrentPlayer(),
			queen = (currentPlayer === 'W') ? 'WQ' : 'BQ',
			rook = (currentPlayer === 'W') ? 'WR' : 'BR',
			bishop = (currentPlayer === 'W') ? 'WB' : 'BB',
			knight = (currentPlayer === 'W') ? 'WN' : 'BN',
			handleClick = this.handleClick.bind(this);

		return (
			<div ref={(ref) => this.pElm = ref} className='promotion'>
				<div className='promo_square promo_square-light'>
					<span className={'promo_piece'} id={queen}
					      onClick={ handleClick }>{PIECE_ICONS[queen]}</span>
				</div>
				<div className='promo_square promo_square-dark'>
					<span className={'promo_piece'} id={rook}
					      onClick={ handleClick }>{PIECE_ICONS[rook]}</span>
				</div>
				<div className='promo_square promo_square-light'>
					<span className={'promo_piece'} id={bishop}
					      onClick={ handleClick }>{PIECE_ICONS[bishop]}</span>
				</div>
				<div className='promo_square promo_square-dark'>
					<span className={'promo_piece'} id={knight}
					      onClick={ handleClick }>{PIECE_ICONS[knight]}</span>
				</div>
			</div>
		);
	}

	componentDidMount() {
		if (!this.props.sqid) {
			this.pElm.setAttribute('style', 'display: none');
		} else {
			this.pElm.setAttribute('style', 'display: block');
		}
	}

	shouldComponentUpdate(nextProps) {
		return this.props.sqid != nextProps.sqid;
	}

	componentDidUpdate() {
		if (!this.props.sqid) {
			this.pElm.setAttribute('style', 'display: none');
		} else {
			this.pElm.setAttribute('style', 'display: block'); // else we cant size its elements later
			const
				pselms = document.getElementsByClassName('promo_square'),
				belms = document.getElementsByClassName('board'),
				pselm = pselms[0] as HTMLElement,
				belm = belms[0] as HTMLElement,
				bt = belm.offsetTop,
				bl = belm.offsetLeft,
				bh = belm.offsetHeight,
				bw = belm.offsetWidth,
				psw = pselm.offsetWidth;

			this.pElm.setAttribute(
				'style',
				`position: fixed; top: ${(bt + (bh / 2)) - (psw / 2)}px; left: ${(bl + (bw / 2)) - (psw * 2)}px`
			);
		}
	}
}
