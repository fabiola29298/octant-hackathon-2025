'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { TOKENS, TokenSymbol } from '@/lib/contracts';

interface TokenSelectorProps {
  selected: TokenSymbol;
  onSelect: (token: TokenSymbol) => void;
  disabled?: boolean;
}

export function TokenSelector({ selected, onSelect, disabled }: TokenSelectorProps) {
  const selectedToken = TOKENS[selected];
  const availableTokens = Object.keys(TOKENS) as TokenSymbol[];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600 min-w-[100px] justify-between"
          disabled={disabled}
        >
          <span className="font-semibold">{selectedToken.symbol}</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-zinc-800 border-zinc-700 text-white">
        {availableTokens.map((tokenSymbol) => {
          const token = TOKENS[tokenSymbol];
          return (
            <DropdownMenuItem
              key={tokenSymbol}
              onClick={() => onSelect(tokenSymbol)}
              className="hover:bg-zinc-700 cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="font-semibold">{token.symbol}</div>
                  <div className="text-xs text-zinc-400">{token.name}</div>
                </div>
                {tokenSymbol === selected && (
                  <span className="text-green-400">✓</span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
