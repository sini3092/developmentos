"use client"



import { useEffect, useState } from "react"

import { CloudOff, RefreshCw, Upload, Wifi, WifiOff } from "lucide-react"



import { Button } from "@/components/ui/button"

import { useDraftQueueSync } from "@/hooks/use-draft-queue-sync"



export function PwaProvider() {

  const [isOnline, setIsOnline] = useState(true)

  const [updateReady, setUpdateReady] = useState(false)

  const [registration, setRegistration] =

    useState<ServiceWorkerRegistration | null>(null)

  const { pendingCount, syncing, sync, lastSync } = useDraftQueueSync()



  useEffect(() => {

    setIsOnline(navigator.onLine)



    function handleOnline() {

      setIsOnline(true)

      void sync()

      void fetch("/api/push/deliver", { method: "POST" })

    }



    function handleOffline() {

      setIsOnline(false)

    }



    window.addEventListener("online", handleOnline)

    window.addEventListener("offline", handleOffline)



    return () => {

      window.removeEventListener("online", handleOnline)

      window.removeEventListener("offline", handleOffline)

    }

  }, [sync])



  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            void registration.unregister()
          }
        })
      }
      return
    }

    if (!("serviceWorker" in navigator)) {
      return
    }



    let refreshing = false



    navigator.serviceWorker.addEventListener("controllerchange", () => {

      if (refreshing) return

      refreshing = true

      window.location.reload()

    })



    navigator.serviceWorker

      .register("/sw.js")

      .then((reg) => {

        setRegistration(reg)



        reg.addEventListener("updatefound", () => {

          const installing = reg.installing

          if (!installing) return



          installing.addEventListener("statechange", () => {

            if (installing.state === "installed" && navigator.serviceWorker.controller) {

              setUpdateReady(true)

            }

          })

        })

      })

      .catch(() => {

        // Service worker registration is optional in development.

      })



    void fetch("/api/push/deliver", { method: "POST" })

  }, [])



  function applyUpdate() {

    registration?.waiting?.postMessage({ type: "SKIP_WAITING" })

    setUpdateReady(false)

  }



  return (

    <>

      {!isOnline ? (

        <div className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">

          <WifiOff className="size-4" />

          Offline mode — drafts are saved locally and will sync when you reconnect

        </div>

      ) : null}



      {isOnline && pendingCount > 0 ? (

        <div className="flex items-center justify-between gap-3 border-b border-info/30 bg-info/10 px-4 py-2 text-sm">

          <span className="flex items-center gap-2 text-info">

            <CloudOff className="size-4" />

            {pendingCount} draft{pendingCount === 1 ? "" : "s"} waiting to send

            {lastSync?.synced ? ` — ${lastSync.synced} synced` : ""}

            {lastSync?.failed ? `, ${lastSync.failed} failed` : ""}

          </span>

          <Button type="button" size="sm" variant="outline" disabled={syncing} onClick={() => void sync()}>

            <Upload className="size-4" />

            {syncing ? "Syncing…" : "Sync now"}

          </Button>

        </div>

      ) : null}



      {updateReady ? (

        <div className="flex items-center justify-between gap-3 border-b border-info/30 bg-info/10 px-4 py-2 text-sm">

          <span className="flex items-center gap-2 text-info">

            <RefreshCw className="size-4" />

            A new version of DevelopmentOS is ready.

          </span>

          <Button type="button" size="sm" variant="outline" onClick={applyUpdate}>

            Reload

          </Button>

        </div>

      ) : null}



      {isOnline && !updateReady && pendingCount === 0 ? (

        <span className="sr-only">

          <Wifi className="size-4" />

          Online

        </span>

      ) : null}

    </>

  )

}

