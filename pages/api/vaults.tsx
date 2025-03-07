import {NextApiRequest, NextApiResponse} from 'next/types';
import {TVaultStrategy, TVaultStrategies, 
	TVault, TVaultWithStrats} from 'types';

const	STABLE_UNDERLYING: string[][] = [];
STABLE_UNDERLYING[1] = [ // ethereum
	'0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
	'0x57Ab1ec28D129707052df4dF418D58a2D46d5f51', // sUSD
	'0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
	'0x0000000000085d4780B73119b644AE5ecd22b376', // TUSD
	'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
	'0x5f98805A4E8be255a32880FDeC7F6728C6568bA0' // LUSD
];
STABLE_UNDERLYING[250] = [ // fantom
	'0x82f0B8B456c1A451378467398982d4834b6829c1', // MIM
	'0x04068DA6C83AFCFA0e13ba15A6696662335D5B75', // USDC
	'0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E', // DAI
	'0xdc301622e621166BD8E82f2cA0A26c13Ad0BE355', // FRAX
	'0x049d68029688eAbF473097a2fC38ef61633A3C7A' // fUSDT
];
STABLE_UNDERLYING[10] = [ // optimism
	'0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9' // sUSD
];
STABLE_UNDERLYING[42161] = [ // arbitrum
];


async function getVaultStrategies(vaultStrategies: TVaultStrategy[]): Promise<TVaultStrategies> {
	const strategies = [];
	let	hasMissingStrategiesDescriptions = false;
	for (const strategy of vaultStrategies) {
		if (strategy.details?.isActive) {
			if (!strategy.description) {
				hasMissingStrategiesDescriptions = true;
			}
			strategies.push(strategy);	
		}
	}
	return ([strategies, hasMissingStrategiesDescriptions]);
}

async function getStrategies(network: number, isCurve: boolean, isRetired: boolean, isAll: boolean, isStable: boolean, isDefi: boolean):  Promise<TVaultWithStrats[]> {
	let	vaults: TVault[] = (await (await fetch(`https://ydaemon.yearn.finance/${network}/vaults/all?strategiesDetails=withDetails`)).json());
	if (isRetired) {
		vaults = vaults.filter((e): boolean => e?.migration?.available || false);
	} else {
		vaults = vaults.filter((e): boolean => e.type === 'v2');
		if (isAll) {
			// 
		} else if (isStable) {
			vaults = vaults.filter((e): boolean => STABLE_UNDERLYING[network].includes(e.token?.address));
		} else if (isDefi) {
			vaults = vaults.filter((e): boolean => e.apy?.type !== 'crv');
			vaults = vaults.filter((e): boolean => !e.symbol.includes('yvCurve'));
			vaults = vaults.filter((e): boolean => !STABLE_UNDERLYING[network].includes(e.token?.address));
		} else if (isCurve) {
			vaults = vaults.filter((e): boolean => e.apy?.type === 'crv' || e.symbol.includes('yvCurve'));
		} else {
			vaults = vaults.filter((e): boolean => e.apy?.type !== 'crv');
			vaults = vaults.filter((e): boolean => !e.symbol.includes('yvCurve'));
		}
		vaults = vaults.filter((e): boolean => !e?.migration?.available);
		vaults = vaults.sort((e): number => e.symbol === 'yvBOOST' ? -1 : 1);
	}
	const	vaultsWithStrats: TVaultWithStrats[] = [];

	for (const vault of vaults) {
		const	[strategies] = await getVaultStrategies(
			vault.strategies
		);

		vaultsWithStrats.push({
			address: vault.address || '', 
			symbol: vault.token.symbol || '', 
			underlying: vault.token.address || '',
			name: vault.name || '', 
			display_name: vault.display_name || '', 
			icon: vault.icon || '',
			hasBoost: vault?.apy?.composite?.boost ? true : false,
			strategies
		});
	}
	return (vaultsWithStrats);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
	const		{network, isCurve, isRetired, isAll, isStable, isDefi} = req.query;
	const	result = await getStrategies(Number(network), Boolean(isCurve), Boolean(isRetired), Boolean(isAll), Boolean(isStable), Boolean(isDefi));
	return res.status(200).json(result);
}

export async function listVaultsWithStrategies({network = 1, isCurve = false, isRetired = false, isAll = false, isStable = false, isDefi = false}): Promise<string> {
	network = Number(network);
	const	result = await getStrategies(network, isCurve, isRetired, isAll, isStable, isDefi);
	return JSON.stringify(result);
}