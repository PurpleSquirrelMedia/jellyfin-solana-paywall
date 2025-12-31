/* ========================================
   Purple Squirrel Media - Solana NFT Integration
   NFT-Gated Content & Marketplace
   ======================================== */

const SolanaNFT = {
    connection: null,
    wallet: null,
    network: 'mainnet-beta', // or 'devnet' for testing

    /* ========================================
       Wallet Connection
       ======================================== */
    async connectWallet() {
        try {
            // Check for Phantom wallet
            if (window.solana && window.solana.isPhantom) {
                const response = await window.solana.connect();
                this.wallet = response.publicKey.toString();
                console.log('Wallet connected:', this.wallet);
                return { success: true, wallet: this.wallet };
            }

            // Check for Solflare
            if (window.solflare && window.solflare.isSolflare) {
                await window.solflare.connect();
                this.wallet = window.solflare.publicKey.toString();
                console.log('Wallet connected:', this.wallet);
                return { success: true, wallet: this.wallet };
            }

            return {
                success: false,
                error: 'No Solana wallet found. Please install Phantom or Solflare.'
            };
        } catch (error) {
            console.error('Wallet connection failed:', error);
            return { success: false, error: error.message };
        }
    },

    async disconnectWallet() {
        if (window.solana) {
            await window.solana.disconnect();
        }
        this.wallet = null;
        console.log('Wallet disconnected');
    },

    /* ========================================
       NFT Verification for Gated Content
       ======================================== */
    async verifyNFTOwnership(collectionAddress) {
        if (!this.wallet) {
            return { verified: false, error: 'Wallet not connected' };
        }

        try {
            // In production, query Solana for NFTs owned by wallet
            // This would use @solana/web3.js and Metaplex
            const response = await fetch(
                `https://api.helius.xyz/v0/addresses/${this.wallet}/nfts?api-key=YOUR_API_KEY`
            );
            const nfts = await response.json();

            const ownsNFT = nfts.some(nft =>
                nft.collection?.address === collectionAddress
            );

            return { verified: ownsNFT, nfts };
        } catch (error) {
            console.error('NFT verification failed:', error);
            return { verified: false, error: error.message };
        }
    },

    /* ========================================
       NFT-Gated Content Access
       ======================================== */
    async checkAccess(contentId, requiredCollection) {
        const verification = await this.verifyNFTOwnership(requiredCollection);

        if (verification.verified) {
            console.log('Access granted to:', contentId);
            return { access: true };
        }

        return {
            access: false,
            message: 'This content requires an NFT from the collection',
            purchaseLink: `https://magiceden.io/marketplace/${requiredCollection}`
        };
    },

    /* ========================================
       NFT Marketplace Integration
       ======================================== */
    async listForSale(nftMint, price) {
        if (!this.wallet) {
            return { success: false, error: 'Wallet not connected' };
        }

        // In production, create listing transaction
        console.log(`Listing NFT ${nftMint} for ${price} SOL`);

        return {
            success: true,
            listing: {
                mint: nftMint,
                price: price,
                seller: this.wallet,
                marketplace: 'Purple Squirrel Media'
            }
        };
    },

    async buyNFT(listingId) {
        if (!this.wallet) {
            return { success: false, error: 'Wallet not connected' };
        }

        // In production, execute purchase transaction
        console.log(`Purchasing listing ${listingId}`);

        return {
            success: true,
            transaction: 'simulated_tx_signature'
        };
    },

    /* ========================================
       NFT Live Streaming Features
       ======================================== */
    async createNFTStream(config) {
        const { title, description, nftCollection, price, startTime } = config;

        // Create NFT-gated live stream event
        const stream = {
            id: `stream_${Date.now()}`,
            title,
            description,
            nftGate: nftCollection,
            ticketPrice: price,
            startTime,
            creator: this.wallet,
            status: 'scheduled'
        };

        console.log('NFT Stream created:', stream);
        return stream;
    },

    async mintStreamTicket(streamId, recipient) {
        // Mint NFT ticket for stream access
        console.log(`Minting ticket for stream ${streamId} to ${recipient}`);

        return {
            success: true,
            ticket: {
                mint: `ticket_${Date.now()}`,
                stream: streamId,
                owner: recipient
            }
        };
    },

    /* ========================================
       UI Components
       ======================================== */
    renderConnectButton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <button class="solana-connect-btn" id="walletConnectBtn">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M17.9 17.2c-.5-.5-.5-1.3 0-1.8l1.5-1.5c.5-.5.5-1.3 0-1.8L12 4.7 4.6 12.1c-.5.5-.5 1.3 0 1.8l1.5 1.5c.5.5.5 1.3 0 1.8l-1.5 1.5c-.5.5-.5 1.3 0 1.8L12 28l7.4-7.4c.5-.5.5-1.3 0-1.8l-1.5-1.6z"/>
                </svg>
                Connect Wallet
            </button>
        `;

        this.injectStyles();

        document.getElementById('walletConnectBtn').addEventListener('click', async () => {
            const result = await this.connectWallet();
            if (result.success) {
                this.updateWalletUI(result.wallet);
            } else {
                alert(result.error);
            }
        });
    },

    updateWalletUI(wallet) {
        const btn = document.getElementById('walletConnectBtn');
        if (btn) {
            const shortWallet = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
            btn.innerHTML = `
                <span class="wallet-connected">
                    <span class="wallet-dot"></span>
                    ${shortWallet}
                </span>
            `;
            btn.classList.add('connected');
        }
    },

    renderNFTGate(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="nft-gate">
                <div class="gate-icon">
                    <i class="fas fa-lock"></i>
                </div>
                <h3>NFT-Gated Content</h3>
                <p>This exclusive content requires ownership of an NFT from:</p>
                <div class="collection-info">
                    <img src="${config.collectionImage}" alt="${config.collectionName}">
                    <span>${config.collectionName}</span>
                </div>
                <button class="verify-btn" id="verifyNFTBtn">
                    Verify NFT Ownership
                </button>
                <a href="${config.purchaseLink}" target="_blank" class="purchase-link">
                    Don't have one? Purchase on Magic Eden →
                </a>
            </div>
        `;

        document.getElementById('verifyNFTBtn').addEventListener('click', async () => {
            const result = await this.checkAccess(config.contentId, config.collectionAddress);
            if (result.access) {
                container.innerHTML = '<div class="access-granted">Access Granted! Loading content...</div>';
                // Load the gated content
                if (config.onAccess) config.onAccess();
            } else {
                alert(result.message);
            }
        });
    },

    injectStyles() {
        if (document.getElementById('solana-nft-style')) return;

        const style = document.createElement('style');
        style.id = 'solana-nft-style';
        style.textContent = `
            .solana-connect-btn {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 12px 24px;
                background: linear-gradient(135deg, #9945FF, #14F195);
                border: none;
                border-radius: 12px;
                color: white;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s;
                font-family: 'Poppins', sans-serif;
            }
            .solana-connect-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(153, 69, 255, 0.4);
            }
            .solana-connect-btn.connected {
                background: linear-gradient(135deg, #14F195, #9945FF);
            }
            .wallet-connected {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .wallet-dot {
                width: 8px;
                height: 8px;
                background: #14F195;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }
            .nft-gate {
                background: #1e1028;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 400px;
                margin: 0 auto;
            }
            .gate-icon {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #9945FF, #14F195);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 32px;
                color: white;
            }
            .nft-gate h3 {
                color: white;
                font-size: 24px;
                margin-bottom: 10px;
            }
            .nft-gate p {
                color: #a1a1aa;
                font-size: 14px;
                margin-bottom: 20px;
            }
            .collection-info {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                background: rgba(255,255,255,0.05);
                padding: 15px 20px;
                border-radius: 12px;
                margin-bottom: 20px;
            }
            .collection-info img {
                width: 40px;
                height: 40px;
                border-radius: 8px;
            }
            .collection-info span {
                color: white;
                font-weight: 600;
            }
            .verify-btn {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #9945FF, #14F195);
                border: none;
                border-radius: 12px;
                color: white;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                margin-bottom: 15px;
                transition: all 0.3s;
            }
            .verify-btn:hover {
                transform: translateY(-2px);
            }
            .purchase-link {
                color: #9945FF;
                font-size: 13px;
                text-decoration: none;
            }
            .purchase-link:hover {
                text-decoration: underline;
            }
            .access-granted {
                color: #14F195;
                font-size: 18px;
                font-weight: 600;
                padding: 40px;
            }
        `;
        document.head.appendChild(style);
    }
};

/* ========================================
   Export Solana NFT Module
   ======================================== */
window.SolanaNFT = SolanaNFT;

console.log('Purple Squirrel Media - Solana NFT Integration Loaded');
