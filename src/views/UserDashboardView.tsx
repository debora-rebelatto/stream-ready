import React from 'react';
import { useDashboardController } from '../controllers/useDashboardController';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { OnboardingCallout } from '../components/OnboardingCallout';
import { RecommendedBanner } from '../components/RecommendedBanner';
import { SearchSection } from '../components/SearchSection';
import { FeaturePollCard } from '../components/FeaturePollCard';
import { CustomListPills } from '../components/CustomListPills';
import { DashboardFilterToolbar } from '../components/DashboardFilterToolbar';
import { WatchlistGrid } from '../components/WatchlistGrid';
import { GitHubSponsorButton } from '../components/GitHubSponsorButton';
import { SettingsPage } from '../components/SettingsPage';
import { ManageListsModal } from '../components/ManageListsModal';
import { DeleteMovieModal } from '../components/DeleteMovieModal';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { InstallGuideModal } from '../components/InstallGuideModal';
import { QrCodeModal } from '../components/QrCodeModal';

export const UserDashboardView: React.FC = () => {
  const {
    user,
    items,
    stats,
    currentTab,
    customLists,
    activeCustomListId,
    setActiveCustomListId,
    isWatchlistLoading,
    isCheckingAll,
    recheckAll,
    isInstallGuideOpen,
    setIsInstallGuideOpen,
    currentView,
    handleOpenSettings,
    handleBackFromSettings,
    isManageListsOpen,
    setIsManageListsOpen,
    isQrModalOpen,
    setIsQrModalOpen,
    manageListsTab,
    setManageListsTab,
    manifestInfo,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedItems,
    handlePageChange,
    listTopRef,
    isBetaNoticeVisible,
    setIsBetaNoticeVisible,
    movieToDelete,
    setMovieToDelete,
    isDeletingMovie,
    handleDeleteRequest,
    handleConfirmDelete,
    isDeleteAccountOpen,
    setIsDeleteAccountOpen,
    isDeletingAccount,
    handleConfirmDeleteAccount,
    searchQuery,
    setSearchQuery,
    selectedQuality,
    setSelectedQuality,
    includeWatchedInAll,
    setIncludeWatchedInAll,
    sortBy,
    handleTabChange,
    handleSortChange,
    sorted,
    hasActiveFilters,
    clearFilters,
    activeList,
  } = useDashboardController();

  if (currentView === 'settings') {
    return (
      <>
        <SettingsPage
          onBack={handleBackFromSettings}
          onOpenDeleteAccount={() => setIsDeleteAccountOpen(true)}
          onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          manifestUrl={manifestInfo.manifestUrl}
          installUrl={manifestInfo.stremioInstallUrl}
        />
        <InstallGuideModal
          isOpen={isInstallGuideOpen}
          onClose={() => setIsInstallGuideOpen(false)}
          onOpenLogin={() => {}}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          installUrl={manifestInfo.stremioInstallUrl}
          manifestUrl={manifestInfo.manifestUrl}
        />
        <DeleteAccountModal
          isOpen={isDeleteAccountOpen}
          userEmail={user?.email}
          onConfirm={handleConfirmDeleteAccount}
          onClose={() => setIsDeleteAccountOpen(false)}
          isDeleting={isDeletingAccount}
        />
        <QrCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          manifestUrl={manifestInfo.manifestUrl}
          installUrl={manifestInfo.stremioInstallUrl}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0d14]">
      <Navbar
        onOpenSettings={handleOpenSettings}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
        onOpenLists={() => setIsManageListsOpen(true)}
        onOpenDeleteAccount={() => setIsDeleteAccountOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Hero onOpenSettings={handleOpenSettings} onDismiss={() => setIsBetaNoticeVisible(false)} />
        <OnboardingCallout
          onScrollToRecommendations={() => {
            const el = document.getElementById('recommended-banner');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onFocusSearch={() => {
            window.scrollTo({ top: 350, behavior: 'smooth' });
            const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (searchInput) searchInput.focus();
          }}
        />
        <RecommendedBanner />
        <SearchSection />
        {!isBetaNoticeVisible && (
          <FeaturePollCard
            watchlistCount={items.length}
            userEmail={user?.email}
            isBetaNoticeVisible={isBetaNoticeVisible}
          />
        )}

        <CustomListPills
          items={items}
          customLists={customLists}
          activeCustomListId={activeCustomListId}
          setActiveCustomListId={setActiveCustomListId}
          activeList={activeList}
          filteredCount={sorted.length}
          onOpenStandardLists={() => {
            setManageListsTab('standard');
            setIsManageListsOpen(true);
          }}
          onOpenCustomLists={() => {
            setManageListsTab('custom');
            setIsManageListsOpen(true);
          }}
        />

        <DashboardFilterToolbar
          listTopRef={listTopRef}
          currentTab={currentTab}
          stats={stats}
          onTabChange={handleTabChange}
          isCheckingAll={isCheckingAll}
          onRecheckAll={recheckAll}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedQuality={selectedQuality}
          setSelectedQuality={setSelectedQuality}
          includeWatchedInAll={includeWatchedInAll}
          setIncludeWatchedInAll={setIncludeWatchedInAll}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          totalCount={sorted.length}
        />

        <WatchlistGrid
          isLoading={isWatchlistLoading}
          itemsCount={items.length}
          sortedCount={sorted.length}
          paginatedItems={paginatedItems}
          currentTab={currentTab}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          onDeleteRequest={handleDeleteRequest}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={setItemsPerPage}
        />
      </main>

      <InstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
        onOpenLogin={() => {}}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        installUrl={manifestInfo.stremioInstallUrl}
        manifestUrl={manifestInfo.manifestUrl}
      />
      <ManageListsModal
        isOpen={isManageListsOpen}
        onClose={() => setIsManageListsOpen(false)}
        initialTab={manageListsTab}
      />
      <DeleteMovieModal
        isOpen={!!movieToDelete}
        movieName={movieToDelete?.name || ''}
        moviePoster={movieToDelete?.poster}
        movieYear={movieToDelete?.year}
        onConfirm={handleConfirmDelete}
        onClose={() => setMovieToDelete(null)}
        isDeleting={isDeletingMovie}
      />
      <DeleteAccountModal
        isOpen={isDeleteAccountOpen}
        userEmail={user?.email}
        onConfirm={handleConfirmDeleteAccount}
        onClose={() => setIsDeleteAccountOpen(false)}
        isDeleting={isDeletingAccount}
      />
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        manifestUrl={manifestInfo.manifestUrl}
        installUrl={manifestInfo.stremioInstallUrl}
      />

      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="shrink-0">
            🎬{' '}
            <span className="font-semibold text-gray-400">
              Stremio Watchlist (Good Quality Tracker)
            </span>{' '}
            • Beta Version
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-gray-400 text-[11px] hidden sm:inline">Support the project:</span>
            <GitHubSponsorButton size="sm" />
          </div>
          <p className="text-[11px] text-gray-600 shrink-0">
            Disclaimer: Community tool not affiliated with Stremio.
          </p>
        </div>
      </footer>
    </div>
  );
};
