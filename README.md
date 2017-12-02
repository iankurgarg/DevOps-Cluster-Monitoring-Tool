# devops-milestone4
Final Milestone of DevOps Course Project

## nginx load balancer

I have added ``` default ``` config file in role "load_balancer", have a look at it.

It will perform load balancing in round-robin fashion.

In order to dynamically add hosts just put all the IPs inside ``` upstream checkbox.io ``` block as shown and then do "sudo systemctl reload nginx".

Please not it is reload and not restart.

This command can be executed via exec_sync module of node.

Very simple.

If there are no hosts available, then we will return 404. You can find the syntax in ``` default ``` file itself.
