import { publicClient } from '@/lib/viem';
import { CONTRACT_ABI, CONTRACT_ADDRESS, CONTRACT_PROFE_ROLE_HASH } from '@/lib/contract';


import {
    type Address,
    type Abi,
    parseEther,
    type WriteContractReturnType,
    type WalletClient, 
    type Account,     
    type Chain,      
} from 'viem';